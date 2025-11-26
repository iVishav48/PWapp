const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET /api/orders - Get user's orders
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      status,
      fromDate,
      toDate,
    } = req.query;

    const query = { userId };
    
    if (status) {
      query.orderStatus = status;
    }
    
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }

    const skip = (page - 1) * limit;
    const orders = await Order.find(query)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      message: 'Error fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/orders - Create new order
router.post('/',
  auth,
  [
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress').isObject().withMessage('Shipping address is required'),
    body('shippingAddress.fullName').trim().isLength({ min: 1 }).withMessage('Full name is required'),
    body('shippingAddress.address').trim().isLength({ min: 1 }).withMessage('Address is required'),
    body('shippingAddress.city').trim().isLength({ min: 1 }).withMessage('City is required'),
    body('shippingAddress.state').trim().isLength({ min: 1 }).withMessage('State is required'),
    body('shippingAddress.zipCode').trim().isLength({ min: 1 }).withMessage('ZIP code is required'),
    body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'cash_on_delivery']).withMessage('Valid payment method is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, shippingAddress, paymentMethod, discount = 0, notes } = req.body;
      const userId = req.user.id;

      // Validate products and calculate totals
      const orderItems = [];
      let subtotal = 0;
      const stockUpdates = []; // Track stock updates for atomic operations
      
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product ${item.productId} not found` });
        }

        if (!product.isActive) {
          return res.status(400).json({ message: `Product ${product.name} is not available` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
          });
        }

        const itemTotal = product.finalPrice * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          product: item.productId,
          quantity: item.quantity,
          price: product.finalPrice,
          name: product.name,
          image: product.images.length > 0 ? product.images[0].url : null,
        });

        // Prepare stock update for atomic operation
        stockUpdates.push({
          productId: item.productId,
          quantity: item.quantity,
          productName: product.name,
        });
      }

      // Calculate totals
      const tax = subtotal * 0.08; // 8% tax
      const shippingCost = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
      const total = subtotal + tax + shippingCost - discount;

      if (total < 0) {
        return res.status(400).json({ message: 'Invalid discount amount' });
      }

      // CRITICAL FIX: Update stock atomically BEFORE saving order
      // This ensures stock is decremented when order is created
      // Using atomic $inc with condition to prevent negative stock
      const stockUpdateResults = [];
      for (const stockUpdate of stockUpdates) {
        const updateResult = await Product.findByIdAndUpdate(
          stockUpdate.productId,
          { 
            $inc: { stock: -stockUpdate.quantity },
            $min: { stock: 0 } // Ensure stock doesn't go negative
          },
          { new: true } // Return updated document
        );

        // Double-check stock didn't go negative (race condition protection)
        if (updateResult && updateResult.stock < 0) {
          // Rollback: restore stock for all previously updated products
          for (const prevUpdate of stockUpdateResults) {
            await Product.findByIdAndUpdate(
              prevUpdate.productId,
              { $inc: { stock: prevUpdate.quantity } }
            );
          }
          return res.status(400).json({ 
            message: `Insufficient stock for ${stockUpdate.productName}. Please try again.` 
          });
        }
        stockUpdateResults.push(stockUpdate);
      }

      try {
        // Create order AFTER stock is successfully decremented
        const order = new Order({
          userId,
          items: orderItems,
          shippingAddress,
          paymentMethod,
          subtotal,
          tax,
          shippingCost,
          discount,
          total,
          notes,
          orderStatus: 'pending',
          paymentStatus: 'pending',
        });

        // Calculate expected delivery date
        order.calculateTotals();

        // Check if this is an offline order
        if (req.body.offlineOrderId) {
          order.offlineOrderId = req.body.offlineOrderId;
          order.isSynced = false;
          order.syncStatus = 'pending';
        }

        await order.save();
      } catch (orderError) {
        // Rollback stock if order save fails
        for (const stockUpdate of stockUpdateResults) {
          await Product.findByIdAndUpdate(
            stockUpdate.productId,
            { $inc: { stock: stockUpdate.quantity } }
          );
        }
        throw orderError; // Re-throw to be caught by outer catch
      }

      // Clear user's cart
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cart.clearCart();
        await cart.save();
      }

      res.status(201).json({
        message: 'Order created successfully',
        order,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ 
        message: 'Error creating order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// PUT /api/orders/:id/status - Update order status (admin only)
router.put('/:id/status',
  auth,
  [
    body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Valid status is required'),
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, notes } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user is admin or owns the order
      if (order.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this order' });
      }

      order.updateStatus(status, notes);
      await order.save();

      res.json({
        message: 'Order status updated successfully',
        order,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ 
        message: 'Error updating order status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// PUT /api/orders/:id/payment - Update payment status
router.put('/:id/payment',
  auth,
  [
    body('status').isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Valid payment status is required'),
    body('transactionId').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, transactionId } = req.body;
      const order = await Order.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      order.paymentStatus = status;
      if (transactionId) {
        order.transactionId = transactionId;
      }

      await order.save();

      res.json({
        message: 'Payment status updated successfully',
        order,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ 
        message: 'Error updating payment status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// POST /api/orders/sync - Sync offline orders
router.post('/sync', auth, async (req, res) => {
  try {
    const { offlineOrders } = req.body;
    const userId = req.user.id;

    if (!offlineOrders || !Array.isArray(offlineOrders)) {
      return res.status(400).json({ message: 'Invalid offline orders data' });
    }

    const syncedOrders = [];
    const syncErrors = [];

    for (const offlineOrder of offlineOrders) {
      try {
        // Check if order already exists
        const existingOrder = await Order.findOne({
          offlineOrderId: offlineOrder.offlineOrderId,
          userId,
        });

        if (existingOrder) {
          syncedOrders.push(existingOrder);
          continue;
        }

        // Validate and create order
        const orderItems = [];
        let subtotal = 0;
        const stockUpdates = [];
        
        for (const item of offlineOrder.items) {
          const product = await Product.findById(item.productId);
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          if (!product.isActive || product.stock < item.quantity) {
            throw new Error(`Product ${product.name} is not available or out of stock`);
          }

          const itemTotal = product.finalPrice * item.quantity;
          subtotal += itemTotal;

          orderItems.push({
            product: item.productId,
            quantity: item.quantity,
            price: product.finalPrice,
            name: product.name,
            image: product.images.length > 0 ? product.images[0].url : null,
          });

          stockUpdates.push({
            productId: item.productId,
            quantity: item.quantity,
            productName: product.name,
          });
        }

        const tax = subtotal * 0.08;
        const shippingCost = subtotal > 50 ? 0 : 9.99;
        const total = subtotal + tax + shippingCost - (offlineOrder.discount || 0);

        // CRITICAL FIX: Update stock atomically BEFORE saving order
        const stockUpdateResults = [];
        for (const stockUpdate of stockUpdates) {
          const updateResult = await Product.findByIdAndUpdate(
            stockUpdate.productId,
            { 
              $inc: { stock: -stockUpdate.quantity },
              $min: { stock: 0 }
            },
            { new: true }
          );

          if (updateResult && updateResult.stock < 0) {
            // Rollback all previous stock updates
            for (const prevUpdate of stockUpdateResults) {
              await Product.findByIdAndUpdate(
                prevUpdate.productId,
                { $inc: { stock: prevUpdate.quantity } }
              );
            }
            throw new Error(`Insufficient stock for ${stockUpdate.productName}`);
          }
          stockUpdateResults.push(stockUpdate);
        }

        try {
          const order = new Order({
            userId,
            items: orderItems,
            shippingAddress: offlineOrder.shippingAddress,
            paymentMethod: offlineOrder.paymentMethod,
            subtotal,
            tax,
            shippingCost,
            discount: offlineOrder.discount || 0,
            total,
            offlineOrderId: offlineOrder.offlineOrderId,
            isSynced: true,
            syncStatus: 'synced',
            orderStatus: 'pending',
            paymentStatus: 'pending',
            createdAt: offlineOrder.createdAt || new Date(),
          });

          order.calculateTotals();
          await order.save();
        } catch (orderError) {
          // Rollback stock if order save fails
          for (const stockUpdate of stockUpdateResults) {
            await Product.findByIdAndUpdate(
              stockUpdate.productId,
              { $inc: { stock: stockUpdate.quantity } }
            );
          }
          throw orderError;
        }

        syncedOrders.push(order);
      } catch (error) {
        syncErrors.push({
          offlineOrderId: offlineOrder.offlineOrderId,
          error: error.message,
        });
      }
    }

    res.json({
      message: 'Offline orders synced successfully',
      syncedOrders,
      syncErrors: syncErrors.length > 0 ? syncErrors : undefined,
    });
  } catch (error) {
    console.error('Error syncing offline orders:', error);
    res.status(500).json({ 
      message: 'Error syncing offline orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
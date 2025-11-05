const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET /api/sync/data - Get all data for offline sync
router.get('/data', auth, async (req, res) => {
  try {
    const { lastSync, categories = true, products = true } = req.query;
    
    const response = {
      timestamp: new Date().toISOString(),
      data: {},
    };

    // Get categories if requested
    if (categories === 'true') {
      const categoryQuery = { isActive: true };
      if (lastSync) {
        categoryQuery.updatedAt = { $gt: new Date(lastSync) };
      }
      
      response.data.categories = await Category.find(categoryQuery)
        .populate('parentCategory', 'name slug')
        .sort({ sortOrder: 1, name: 1 })
        .lean();
    }

    // Get products if requested
    if (products === 'true') {
      const productQuery = { isActive: true };
      if (lastSync) {
        productQuery.updatedAt = { $gt: new Date(lastSync) };
      }
      
      response.data.products = await Product.find(productQuery)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .lean();
    }

    // Get user's cart
    const cart = await Cart.findOne({ userId: req.user.id })
      .populate('items.product', 'name price discountPrice images stock')
      .lean();
    
    response.data.cart = cart;

    // Get user's recent orders
    const orders = await Order.find({ 
      userId: req.user.id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    response.data.orders = orders;

    res.json(response);
  } catch (error) {
    console.error('Error fetching sync data:', error);
    res.status(500).json({ 
      message: 'Error fetching sync data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/sync/products - Get products for offline sync
router.get('/products', async (req, res) => {
  try {
    const { 
      lastSync, 
      category, 
      page = 1, 
      limit = 100,
      featured = false 
    } = req.query;

    const query = { isActive: true };
    
    if (lastSync) {
      query.updatedAt = { $gt: new Date(lastSync) };
    }
    
    if (category) {
      query.category = category;
    }
    
    if (featured === 'true') {
      query.isFeatured = true;
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching sync products:', error);
    res.status(500).json({ 
      message: 'Error fetching sync products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/sync/categories - Get categories for offline sync
router.get('/categories', async (req, res) => {
  try {
    const { lastSync, parent = null } = req.query;
    
    const query = { isActive: true };
    
    if (lastSync) {
      query.updatedAt = { $gt: new Date(lastSync) };
    }
    
    if (parent !== null) {
      query.parentCategory = parent === 'null' ? null : parent;
    }

    const categories = await Category.find(query)
      .populate('parentCategory', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.json({
      categories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching sync categories:', error);
    res.status(500).json({ 
      message: 'Error fetching sync categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/sync/cart - Sync cart data
router.post('/cart', auth, async (req, res) => {
  try {
    const { items, pendingActions } = req.body;
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        pendingActions: [],
      });
    }

    // Update cart items if provided
    if (items && Array.isArray(items)) {
      cart.items = items.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        addedAt: item.addedAt || new Date(),
      }));
    }

    // Update pending actions if provided
    if (pendingActions && Array.isArray(pendingActions)) {
      cart.pendingActions = pendingActions;
      cart.syncStatus = 'pending';
    }

    await cart.save();
    await cart.populate('items.product', 'name price discountPrice images stock');

    res.json({
      message: 'Cart synced successfully',
      cart,
    });
  } catch (error) {
    console.error('Error syncing cart:', error);
    res.status(500).json({ 
      message: 'Error syncing cart',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/sync/orders - Sync offline orders
router.post('/orders', auth, async (req, res) => {
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
        }

        const tax = subtotal * 0.08;
        const shippingCost = subtotal > 50 ? 0 : 9.99;
        const total = subtotal + tax + shippingCost - (offlineOrder.discount || 0);

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

        // Update product stock
        for (const item of orderItems) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } }
          );
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

// GET /api/sync/status - Get sync status
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ userId });
    const pendingOrders = await Order.find({ 
      userId, 
      syncStatus: 'pending' 
    }).countDocuments();

    res.json({
      cartSyncStatus: cart?.syncStatus || 'synced',
      pendingOrders,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ 
      message: 'Error fetching sync status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/sync/health - Health check for sync service
router.post('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in sync health check:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
const express = require('express');
const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET /api/cart - Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let cart = await Cart.findOne({ 
      userId
    }).populate('items.product', 'name price discountPrice images stock');

    if (!cart) {
      cart = new Cart({
        userId,
        isGuest: !req.user.isAuthenticated,
        items: [],
      });
      await cart.save();
    }

    // Validate cart items (check stock, update prices)
    await validateCartItems(cart);

    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ 
      message: 'Error fetching cart',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/cart/add - Add item to cart
router.post('/add',
  auth,
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, quantity } = req.body;
      const userId = req.user.id;

      // Find product
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (!product.isActive) {
        return res.status(400).json({ message: 'Product is not available' });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ 
          message: `Only ${product.stock} items available in stock` 
        });
      }

      // Find or create cart
      let cart = await Cart.findOne({ userId });

      if (!cart) {
        cart = new Cart({
          userId,
          isGuest: !req.user.isAuthenticated,
          items: [],
        });
      }

      // Add item to cart
      cart.addItem(productId, quantity, product.finalPrice);
      
      // Add to pending actions if offline
      if (req.body.isOffline) {
        cart.pendingActions.push({
          action: 'add',
          productId,
          quantity,
          timestamp: new Date(),
        });
        cart.syncStatus = 'pending';
      }

      await cart.save();
      await cart.populate('items.product', 'name price discountPrice images stock');

      res.json({
        message: 'Item added to cart',
        cart,
        item: cart.items.find(item => item.product._id.toString() === productId.toString()),
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      res.status(500).json({ 
        message: 'Error adding item to cart',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// PUT /api/cart/update - Update item quantity
router.put('/update',
  auth,
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 0, max: 99 }).withMessage('Quantity must be between 0 and 99'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, quantity } = req.body;
      const userId = req.user.id;

      // Find cart
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }

      if (quantity > 0) {
        // Check product availability
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }

        if (product.stock < quantity) {
          return res.status(400).json({ 
            message: `Only ${product.stock} items available in stock` 
          });
        }
      }

      // Update item quantity
      cart.updateItem(productId, quantity);
      
      // Add to pending actions if offline
      if (req.body.isOffline) {
        cart.pendingActions.push({
          action: 'update',
          productId,
          quantity,
          timestamp: new Date(),
        });
        cart.syncStatus = 'pending';
      }

      await cart.save();
      await cart.populate('items.product', 'name price discountPrice images stock');

      res.json({
        message: quantity > 0 ? 'Item quantity updated' : 'Item removed from cart',
        cart,
      });
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ 
        message: 'Error updating cart item',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// DELETE /api/cart/remove/:productId - Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.removeItem(productId);
    
    // Add to pending actions if offline
    if (req.body.isOffline) {
      cart.pendingActions.push({
        action: 'remove',
        productId,
        timestamp: new Date(),
      });
      cart.syncStatus = 'pending';
    }

    await cart.save();
    await cart.populate('items.product', 'name price discountPrice images stock');

    res.json({
      message: 'Item removed from cart',
      cart,
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ 
      message: 'Error removing item from cart',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.clearCart();
    
    // Add to pending actions if offline
    if (req.body.isOffline) {
      cart.pendingActions.push({
        action: 'clear',
        timestamp: new Date(),
      });
      cart.syncStatus = 'pending';
    }

    await cart.save();

    res.json({
      message: 'Cart cleared',
      cart,
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ 
      message: 'Error clearing cart',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/cart/sync - Sync offline cart actions
router.post('/sync', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { pendingActions } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    let syncErrors = [];
    let processedActions = [];

    // Process each pending action
    for (const action of pendingActions) {
      try {
        switch (action.action) {
          case 'add':
            const addProduct = await Product.findById(action.productId);
            if (addProduct && addProduct.isActive && addProduct.stock >= action.quantity) {
              cart.addItem(action.productId, action.quantity, addProduct.finalPrice);
            } else {
              syncErrors.push({
                action: action.action,
                productId: action.productId,
                error: 'Product not available or insufficient stock',
              });
            }
            break;
            
          case 'update':
            const updateProduct = await Product.findById(action.productId);
            if (updateProduct && action.quantity > 0 && updateProduct.stock >= action.quantity) {
              cart.updateItem(action.productId, action.quantity);
            } else if (action.quantity === 0) {
              cart.removeItem(action.productId);
            } else {
              syncErrors.push({
                action: action.action,
                productId: action.productId,
                error: 'Product not available or insufficient stock',
              });
            }
            break;
            
          case 'remove':
            cart.removeItem(action.productId);
            break;
            
          case 'clear':
            cart.clearCart();
            break;
        }
        
        processedActions.push(action);
      } catch (error) {
        syncErrors.push({
          action: action.action,
          productId: action.productId,
          error: error.message,
        });
      }
    }

    // Remove processed actions from pending
    cart.pendingActions = cart.pendingActions.filter(
      action => !processedActions.some(processed => 
        processed.timestamp.getTime() === action.timestamp.getTime() &&
        processed.action === action.action
      )
    );

    // Update sync status
    cart.syncStatus = syncErrors.length > 0 ? 'failed' : 'synced';

    await cart.save();
    await cart.populate('items.product', 'name price discountPrice images stock');

    res.json({
      message: 'Cart synced successfully',
      cart,
      syncErrors: syncErrors.length > 0 ? syncErrors : undefined,
    });
  } catch (error) {
    console.error('Error syncing cart:', error);
    res.status(500).json({ 
      message: 'Error syncing cart',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to validate cart items
async function validateCartItems(cart) {
  const updatedItems = [];
  let hasChanges = false;

  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    
    if (!product || !product.isActive) {
      hasChanges = true;
      continue; // Skip invalid products
    }

    if (product.stock < item.quantity) {
      hasChanges = true;
      item.quantity = Math.min(item.quantity, product.stock);
    }

    if (product.finalPrice !== item.price) {
      hasChanges = true;
      item.price = product.finalPrice;
    }

    updatedItems.push(item);
  }

  if (hasChanges) {
    cart.items = updatedItems;
    await cart.save();
  }
}

module.exports = router;
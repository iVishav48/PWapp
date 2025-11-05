const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [99, 'Quantity cannot exceed 99'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  items: [cartItemSchema],
  sessionId: {
    type: String,
    index: true,
  },
  isGuest: {
    type: Boolean,
    default: true,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced',
  },
  pendingActions: [{
    action: {
      type: String,
      enum: ['add', 'update', 'remove', 'clear'],
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    quantity: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
cartSchema.index({ userId: 1, sessionId: 1 });
cartSchema.index({ lastModified: 1 });

// Virtual for total items
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for subtotal
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual for total weight
cartSchema.virtual('totalWeight').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.product?.weight || 0) * item.quantity;
  }, 0);
});

// Pre-save middleware to update lastModified
cartSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity, price) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = price; // Update price in case it changed
  } else {
    this.items.push({
      product: productId,
      quantity: quantity,
      price: price,
    });
  }
};

// Method to update item quantity
cartSchema.methods.updateItem = function(productId, quantity) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
      );
    } else {
      item.quantity = quantity;
    }
  }
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.pendingActions = [];
  this.syncStatus = 'synced';
};

module.exports = mongoose.model('Cart', cartSchema);
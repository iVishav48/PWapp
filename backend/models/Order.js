const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  name: {
    type: String,
    required: true,
  },
  image: String,
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    default: 'US',
  },
  phone: String,
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'cash_on_delivery'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    default: 0,
    min: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  expectedDeliveryDate: {
    type: Date,
  },
  trackingNumber: String,
  notes: String,
  isSynced: {
    type: Boolean,
    default: true,
  },
  offlineOrderId: String, // For tracking offline orders
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
// Note: orderNumber already has index from unique: true and index: true
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ expectedDeliveryDate: 1 });

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    items: this.items.length,
    subtotal: this.subtotal,
    tax: this.tax,
    shippingCost: this.shippingCost,
    discount: this.discount,
    total: this.total,
  };
});

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const datePrefix = date.getFullYear().toString().slice(-2) + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0');
    
    const lastOrder = await this.constructor.findOne({
      orderNumber: new RegExp(`^${datePrefix}`)
    }).sort({ orderNumber: -1 });
    
    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber.startsWith(datePrefix)) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    this.orderNumber = datePrefix + sequence.toString().padStart(4, '0');
  }
  
  // Calculate expected delivery date (3-7 days from now)
  if (!this.expectedDeliveryDate) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 5) + 3);
    this.expectedDeliveryDate = deliveryDate;
  }
  
  next();
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.orderStatus = newStatus;
  if (notes) {
    this.notes = this.notes ? `${this.notes}\n${notes}` : notes;
  }
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.tax = this.subtotal * 0.08; // 8% tax rate
  this.shippingCost = this.subtotal > 50 ? 0 : 9.99; // Free shipping over $50
  this.total = this.subtotal + this.tax + this.shippingCost - this.discount;
};

module.exports = mongoose.model('Order', orderSchema);
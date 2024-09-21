const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema({
    couponName: {
    type: String,
    required: true,
    unique: true
  },
  couponImage: [String], 
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  minPurchase: {
    type: Number,
    required: true
  },
  discountType: {
    type: String,
    enum: ['Percentage', 'Amount'],
    required: true
  },
  discountPercentage: {
    type: Number,
    required: function() { return this.discountType === 'Percentage'; }
  },
  discountValue: {
    type: Number,
    required: function() { return this.discountType === 'Amount'; }
  },
  status: {
    type: Boolean,
  
    default: true
  }, 
  userUsageLimit: {
    type: Number,
    default: null  // Limit the number of times a user can use this coupon
  }

}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;

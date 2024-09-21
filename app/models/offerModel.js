const mongoose = require('mongoose');
// Define the Offer Schema
const OfferSchema = new mongoose.Schema({
  offerName: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true    
  },
  offerFor: {
    type: String,
    enum: ['product', 'category'], // Can only be 'product' or 'category'
    required: true
  },
  products: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }, // Array of product IDs if applicable to products
  categories: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category' 
  }, // Array of category IDs if applicable to categories
  offerType: {
    type: String,
    enum: ['percentage', 'amount'], // Can only be 'percentage' or 'amount'
  },
  offerPercentage: {
    type: Number   
  }, 
  offerAmount: {
    type: Number,
    default:0     
  },
  productPrice: {
    type: Number,
  },  
   offerPrice: {
    type: Number,
  },  
  description: {
    type: String,
    trim: true
  },
  status:{
    type: Boolean,
    default:true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Offer = mongoose.model('Offer', OfferSchema);
module.exports = Offer;


const mongoose = require('mongoose');

// Define the Cart schema
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Reference to Product
      quantity: { type: Number, required: true, min: 1 } // Quantity of the product
    }
  ],
  isActive: { type: Boolean, default: true },

}, { timestamps: true }); // Add timestamps for createdAt and updatedAt

// Create and export the Cart model
const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;

const mongoose = require("mongoose");
const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  products: 
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // Referencing the Product model
      required: true
    },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
const Wishlist = mongoose.model("Wishlist", wishlistSchema);

module.exports = Wishlist;

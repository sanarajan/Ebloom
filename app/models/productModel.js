// models/userModel.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  specifications: { type: Map, of: String },
  description: {type: String },
  price: { type: Number, required: true } ,
  quantity:{type:Number,required:true},
  images: [String],
  thumbnailPaths:[String],
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
},{ timestamps: true }); 


const Product = mongoose.model('Product', productSchema);

module.exports = Product;

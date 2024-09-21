// models/userModel.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
 categoryName: { type: String, required: true, unique: true },
 description: {type: String },
 isActive: { type: Boolean, default: true }
}); 




const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  subCategoryName: { type: String, required: true, unique: true },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  description: { type: String },
  isActive: { type: Boolean, default: true }
});

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

module.exports = SubCategory;

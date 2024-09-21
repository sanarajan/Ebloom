const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  house: { type: String, required: true },
  place: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true, minlength: 6, maxlength: 6 },
  
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;

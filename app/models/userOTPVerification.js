const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userOTPVerificationSchema =  new Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }
   
  });
  const userOTPVerification = mongoose.model('userOTPVerification', userOTPVerificationSchema);

module.exports = userOTPVerification;
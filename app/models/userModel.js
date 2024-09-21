const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: false, unique: true, sparse: true },
  email: { type: String, required: false, unique: true },
  displayName: {
    type: String
  },
  password: { type: String, required: false },
  phoneNumber: { type: String, required: false, unique: true, sparse: true, default: null },
  googleId: { type: String, unique: true, sparse: true },
  userType: { type: Number, default: 2 }, // 1 for admin, 2 for regular users
  isActive: { type: Boolean, default: true },
  verified: { type: Boolean },
  address_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Address' }] ,// Array of address references
  referralId:{ type: String, unique: true }
});

// Hash password before saving
userSchema.pre('save', function(next) {
  if (!this.isModified('password')) return next();
  const salt = bcrypt.genSaltSync(10);
  this.password = bcrypt.hashSync(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;

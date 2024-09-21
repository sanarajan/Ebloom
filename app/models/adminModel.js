 

const mongoose = require('mongoose');
const User = require('./userModel');

module.exports = User.discriminator('Admin', new mongoose.Schema({}));


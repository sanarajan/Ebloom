 
// Database configuration (example using MongoDB)
const mongoose = require('mongoose');
const dbURI = process.env.DB_URI || 'mongodb://localhost:27017/blooms';

mongoose.connect(dbURI, { useNewUrlParser: true,
    useNewUrlParser: true,
  useUnifiedTopology: true
 })
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Database connection error:', err));

module.exports = mongoose;



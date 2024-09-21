

const mongoose = require('mongoose');
const walletSchema = new mongoose.Schema(
{
   
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

      Balance: {type:Number,default:0},  
      History: [ 
        {
          TransactionType:  { type: String,
            enum: ['credit', 'debit', 'Referral', 'purchase', 'Refund'],
          },  // Type of transaction (e.g., credit, debit)
          Amount:  {type:Number,default:0},  // Amount of the transaction
          Date: { type: Date, default: null} 
        }
      ]
    }
  ,{ timestamps: true });
  const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;

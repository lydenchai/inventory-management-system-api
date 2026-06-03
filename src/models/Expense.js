const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      default: 'Other',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    receipt_image: {
      type: String,
      default: null,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      default: 'active',
      required: true,
    },
  },
  { timestamps: true }
);

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;

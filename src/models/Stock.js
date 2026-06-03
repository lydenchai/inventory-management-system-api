const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['in', 'out'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    batch_number: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      enum: ['Purchase', 'Sale', 'Return', 'Adjustment', 'Damage', 'Other'],
      default: null,
    },
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    expiry_date: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    completed_at: {
      type: Date,
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

const Stock = mongoose.model('Stock', stockSchema);
module.exports = Stock;

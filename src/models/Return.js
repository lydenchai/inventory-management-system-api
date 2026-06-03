const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    default: null,
  },
  condition: {
    type: String,
    enum: ['sellable', 'damaged', 'defective'],
    default: 'sellable',
  },
});

const returnSchema = new mongoose.Schema(
  {
    return_number: {
      type: String,
      required: true,
      unique: true,
    },
    sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      default: null, // If returning a sale
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null, // If returning to supplier
    },
    items: [returnItemSchema],
    status: {
      type: String,
      enum: ['pending', 'processed', 'rejected'],
      default: 'pending',
    },
    processed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ['customer_return', 'supplier_return'],
      required: true,
    },
  },
  { timestamps: true }
);

const Return = mongoose.model('Return', returnSchema);
module.exports = Return;

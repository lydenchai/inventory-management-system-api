const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    cost_price: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const SaleItem = mongoose.model('SaleItem', saleItemSchema);
module.exports = SaleItem;

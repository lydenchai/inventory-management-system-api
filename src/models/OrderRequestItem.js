const mongoose = require('mongoose');

const orderRequestItemSchema = new mongoose.Schema(
  {
    order_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderRequest',
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
      min: 1,
    },
    unit_price: {
      type: Number,
      default: null,
    },
    subtotal: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index
orderRequestItemSchema.index({ order_request_id: 1, product_id: 1 }, { unique: true });

const OrderRequestItem = mongoose.model('OrderRequestItem', orderRequestItemSchema);
module.exports = OrderRequestItem;

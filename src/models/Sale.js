const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    order_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderRequest',
      default: null,
    },
    total_amount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    grand_total: {
      type: Number,
      default: 0,
    },
    payment_method: {
      type: String,
      default: 'Cash',
    },
    payment_status: {
      type: String,
      default: 'paid',
    },
    notes: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: 'Completed',
    },
    completed_at: {
      type: Date,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;

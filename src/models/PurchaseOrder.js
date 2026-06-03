const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    po_number: {
      type: String,
      required: true,
      unique: true,
    },
    order_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderRequest',
      required: true,
      unique: true,
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    issue_date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'sent', 'acknowledged'],
      default: 'draft',
    },
    total_amount: {
      type: Number,
      required: true,
      default: 0,
    },
    notes: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
module.exports = PurchaseOrder;

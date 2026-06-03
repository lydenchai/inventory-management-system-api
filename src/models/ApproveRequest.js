const mongoose = require('mongoose');

const approveRequestSchema = new mongoose.Schema(
  {
    order_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderRequest',
      required: true,
    },
    status: {
      type: String,
      default: 'pending',
    },
    admin_remarks: {
      type: String,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approved_date: {
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

const ApproveRequest = mongoose.model('ApproveRequest', approveRequestSchema);
module.exports = ApproveRequest;

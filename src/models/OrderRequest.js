const mongoose = require('mongoose');

const orderRequestSchema = new mongoose.Schema(
  {
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'on_hold'],
      default: 'pending',
    },
    notes: {
      type: String,
      default: null,
    },
    customer_remark: {
      type: String,
      default: null,
    },
    admin_remark: {
      type: String,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    delivery_date: {
      type: Date,
      default: null,
    },
    requester_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approved_date: {
      type: Date,
      default: null,
    },
    confirmed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmed_at: {
      type: Date,
      default: null,
    },
    notified: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Virtual for approved_at
orderRequestSchema.virtual('approved_at').get(function() {
  return this.approved_date;
}).set(function(value) {
  this.approved_date = value;
});

// Ensure virtuals are included in toJSON/toObject
orderRequestSchema.set('toJSON', { virtuals: true });
orderRequestSchema.set('toObject', { virtuals: true });

const OrderRequest = mongoose.model('OrderRequest', orderRequestSchema);
module.exports = OrderRequest;

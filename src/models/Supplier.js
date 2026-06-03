const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    contact_person: {
      type: String,
      required: true,
    },
    contact_position: {
      type: String,
      required: true,
    },
    contact_email: {
      type: String,
      default: null,
    },
    contact_phone: {
      type: String,
      required: true,
    },
    address: {
      type: mongoose.Schema.Types.Mixed,
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

const Supplier = mongoose.model('Supplier', supplierSchema);
module.exports = Supplier;

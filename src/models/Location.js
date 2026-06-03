const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'inactive'],
      required: true,
    },
  },
  { timestamps: true }
);

const Location = mongoose.model('Location', locationSchema);
module.exports = Location;

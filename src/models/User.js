const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      default: null,
    },
    last_name: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/\S+@\S+\.\S+/, 'is invalid'],
    },
    phone: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'user',
    },
    user_type: {
      type: String,
      enum: ['internal', 'external'],
      required: true,
    },
    address: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    profile: {
      type: String,
      default: null,
    },
    permission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
      required: true,
    },
    company_name: {
      type: String,
      default: null,
    },
    company_registration_no: {
      type: String,
      default: null,
    },
    request_purpose: {
      type: String,
      default: null,
    },
    expected_order_volume: {
      type: String,
      default: null,
    },
    order_frequency: {
      type: String,
      default: null,
    },
    product_categories: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    id_card_or_business_license: {
      type: String,
      default: null,
    },
    shop_photo: {
      type: String,
      default: null,
    },
    location_lat: {
      type: Number,
      default: null,
    },
    location_lng: {
      type: Number,
      default: null,
    },
    agree_terms: {
      type: Boolean,
      default: false,
    },
    note_from_customer: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
module.exports = User;

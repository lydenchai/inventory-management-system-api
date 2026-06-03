const mongoose = require('mongoose');
const { generateCode } = require('../utils/code.util');

const productSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      default: generateCode,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    cost_price: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    reserved_stock: {
      type: Number,
      default: 0,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
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

const Product = mongoose.model('Product', productSchema);
module.exports = Product;

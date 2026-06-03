const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    permissions: {
      type: [String],
      default: ['view_dashboard'],
      required: true,
    },
    status: {
      type: String,
      default: 'active',
      required: true,
    },
  },
  { timestamps: true }
);

const Permission = mongoose.model('Permission', permissionSchema);
module.exports = Permission;

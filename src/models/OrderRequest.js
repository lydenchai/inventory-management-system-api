const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const OrderRequest = sequelize.define(
  "OrderRequest",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    supplier_id: {
      type: DataTypes.STRING(24),
      allowNull: false,
      references: {
        model: "suppliers",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "on_hold",
      ),
      defaultValue: "pending",
    },
    notes: { type: DataTypes.STRING },
    customer_remark: { type: DataTypes.STRING },
    admin_remark: { type: DataTypes.STRING },
    rejection_reason: { type: DataTypes.STRING },
    delivery_date: { type: DataTypes.DATE },
    requester_id: {
      type: DataTypes.STRING(24),
      allowNull: false,
      references: {
        model: "users",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    approved_by: DataTypes.STRING(24),
    approved_date: { type: DataTypes.DATE },
    // Alias for consistency with schema
    approved_at: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue("approved_date");
      },
      set(value) {
        this.setDataValue("approved_date", value);
      },
    },
    confirmed_by: { type: DataTypes.STRING(24) },
    confirmed_at: { type: DataTypes.DATE },
    notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "order_requests",
  },
);

module.exports = OrderRequest;

const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const Sale = sequelize.define(
  "Sale",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    customer_id: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "users",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    order_request_id: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "order_requests",
        key: "_id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    grand_total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    payment_method: { type: DataTypes.STRING, defaultValue: "Cash" },
    payment_status: { type: DataTypes.STRING, defaultValue: "paid" },
    notes: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING, defaultValue: "Completed" },
    completed_at: { type: DataTypes.DATE },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { timestamps: true, tableName: "sales" },
);

module.exports = Sale;

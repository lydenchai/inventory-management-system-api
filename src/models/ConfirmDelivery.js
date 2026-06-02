const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const ConfirmDelivery = sequelize.define(
  "ConfirmDelivery",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    order_request_id: {
      type: DataTypes.STRING(24),
      allowNull: false,
      references: {
        model: "order_requests",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    status: { type: DataTypes.STRING, defaultValue: "approved" },
    delivery_date: { type: DataTypes.DATE },
    confirmed_by: { type: DataTypes.STRING(24) },
    confirmed_at: { type: DataTypes.DATE },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { timestamps: true, tableName: "confirm_deliveries" },
);

module.exports = ConfirmDelivery;

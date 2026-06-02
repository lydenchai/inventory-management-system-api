const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const OrderRequestItem = sequelize.define(
  "OrderRequestItem",
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
    product_id: {
      type: DataTypes.STRING(24),
      allowNull: false,
      references: {
        model: "products",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue("unit_price");
        return value !== null ? parseFloat(value) : null;
      },
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue("subtotal");
        return value !== null ? parseFloat(value) : null;
      },
    },
  },
  {
    tableName: "order_request_items",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["order_request_id", "product_id"],
      },
    ],
  },
);

module.exports = OrderRequestItem;

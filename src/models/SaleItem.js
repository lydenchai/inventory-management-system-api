const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const SaleItem = sequelize.define(
  "SaleItem",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    sale_id: { type: DataTypes.STRING(24), allowNull: false },
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
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cost_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  },
  { timestamps: true, tableName: "sale_items" },
);

module.exports = SaleItem;

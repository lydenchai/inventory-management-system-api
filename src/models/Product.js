const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");
const { generateCode } = require("../utils/code.util");

const Product = sequelize.define(
  "Product",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      defaultValue: () => generateCode(),
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    price: { type: DataTypes.FLOAT, allowNull: false },
    image: { type: DataTypes.STRING },
    cost_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    reserved_stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    category_id: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "categories",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    supplier_id: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "suppliers",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    },
  },
  { timestamps: true, tableName: "products" },
);

module.exports = Product;

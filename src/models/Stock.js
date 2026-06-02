const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const Stock = sequelize.define(
  "Stock",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
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
    user_id: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "users",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM("in", "out"),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    batch_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reason: {
      type: DataTypes.ENUM(
        "Purchase",
        "Sale",
        "Return",
        "Adjustment",
        "Damage",
        "Other",
      ),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    },
  },
  { timestamps: true, tableName: "stocks" },
);

module.exports = Stock;

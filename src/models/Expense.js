const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const Expense = sequelize.define(
  "Expense",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    description: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    category: {
      type: DataTypes.STRING,
      defaultValue: "Other",
    },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    receipt_image: { type: DataTypes.STRING },
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
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    },
  },
  { timestamps: true, tableName: "expenses" },
);

module.exports = Expense;

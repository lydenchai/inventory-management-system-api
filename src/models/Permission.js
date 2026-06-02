const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const Permission = sequelize.define(
  "Permission",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ["view_dashboard"],
      validate: {
        isArrayOfStrings(value) {
          if (
            !Array.isArray(value) ||
            !value.every((v) => typeof v === "string")
          ) {
            throw new Error("Permissions must be an array of strings");
          }
        },
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    timestamps: true,
    tableName: "permissions",
  },
);

module.exports = Permission;

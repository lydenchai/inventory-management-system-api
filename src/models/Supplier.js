const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const Supplier = sequelize.define(
  "Supplier",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    company_name: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    contact_person: { type: DataTypes.STRING, allowNull: false },
    contact_position: { type: DataTypes.STRING, allowNull: false },
    contact_email: { type: DataTypes.STRING, allowNull: true },
    contact_phone: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
  },
  { timestamps: true, tableName: "suppliers" },
);

module.exports = Supplier;

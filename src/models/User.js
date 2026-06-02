const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const User = sequelize.define(
  "User",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "user",
    },
    user_type: {
      type: DataTypes.ENUM("internal", "external"),
      allowNull: false,
    },
    address: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    profile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    permission_id: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "permissions",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "pending"),
      allowNull: false,
      defaultValue: "active",
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company_registration_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    request_purpose: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expected_order_volume: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order_frequency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    product_categories: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    id_card_or_business_license: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shop_photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location_lat: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    location_lng: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    agree_terms: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    note_from_customer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "users",
  },
);

module.exports = User;

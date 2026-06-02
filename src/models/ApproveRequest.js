const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const ApproveRequest = sequelize.define(
  "ApproveRequest",
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
    status: { type: DataTypes.STRING, defaultValue: "pending" },
    admin_remarks: { type: DataTypes.STRING },
    rejection_reason: { type: DataTypes.STRING },
    approved_by: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "users",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    confirmed_by: {
      type: DataTypes.STRING(24),
      allowNull: true,
      references: {
        model: "users",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    approved_date: { type: DataTypes.DATE },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { timestamps: true, tableName: "approve_requests" },
);

module.exports = ApproveRequest;

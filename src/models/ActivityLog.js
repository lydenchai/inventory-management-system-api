const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");
const { generateObjectId } = require("../utils/objectId.util");

const ActivityLog = sequelize.define(
  "ActivityLog",
  {
    _id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      defaultValue: () => generateObjectId(),
    },
    user_id: {
      type: DataTypes.STRING(24),
      allowNull: false,
      references: {
        model: "users",
        key: "_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT },
    entity_type: { type: DataTypes.STRING },
    entity_id: { type: DataTypes.STRING(24) },
  },
  { timestamps: true, tableName: "activity_logs" },
);

module.exports = ActivityLog;

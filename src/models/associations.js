const User = require("./User");
const Sale = require("./Sale");
const Stock = require("./Stock");
const Expense = require("./Expense");
const Product = require("./Product");
const Category = require("./Category");
const Supplier = require("./Supplier");
const SaleItem = require("./SaleItem");
const Permission = require("./Permission");
const ActivityLog = require("./ActivityLog");
const OrderRequest = require("./OrderRequest");
const Notification = require("./Notification");
const ApproveRequest = require("./ApproveRequest");
const ConfirmDelivery = require("./ConfirmDelivery");
const OrderRequestItem = require("./OrderRequestItem");

// ================= Associations =================

// Product-Category
Product.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Category.hasMany(Product, { foreignKey: "category_id", as: "products" });

// Product-Supplier
Product.belongsTo(Supplier, {
  foreignKey: "supplier_id",
  as: "supplier",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Supplier.hasMany(Product, { foreignKey: "supplier_id", as: "products" });

// OrderRequest-Supplier
OrderRequest.belongsTo(Supplier, {
  foreignKey: "supplier_id",
  as: "supplier",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Supplier.hasMany(OrderRequest, {
  foreignKey: "supplier_id",
  as: "order_requests",
});

// OrderRequest-Requester (User)
OrderRequest.belongsTo(User, {
  foreignKey: "requester_id",
  as: "requester",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
User.hasMany(OrderRequest, {
  foreignKey: "requester_id",
  as: "order_requests",
});

// OrderRequest-Approver (User)
OrderRequest.belongsTo(User, {
  foreignKey: "approved_by",
  as: "approver",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// OrderRequest-Confirmer (User)
OrderRequest.belongsTo(User, {
  foreignKey: "confirmed_by",
  as: "confirmer",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// OrderRequest-OrderRequestItem
OrderRequest.hasMany(OrderRequestItem, {
  foreignKey: "order_request_id",
  as: "items",
});
OrderRequestItem.belongsTo(OrderRequest, {
  foreignKey: "order_request_id",
  as: "order_request",
});

// Product-OrderRequestItem
Product.hasMany(OrderRequestItem, {
  foreignKey: "product_id",
  as: "order_request_items",
});
OrderRequestItem.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

// User-Permission
User.belongsTo(Permission, {
  foreignKey: "permission_id",
  as: "permission",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Permission.hasMany(User, { foreignKey: "permission_id", as: "users" });

// Sale-Customer (User)
Sale.belongsTo(User, {
  foreignKey: "customer_id",
  as: "customer",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
User.hasMany(Sale, { foreignKey: "customer_id", as: "sales" });

// Sale-OrderRequest
Sale.belongsTo(OrderRequest, {
  foreignKey: "order_request_id",
  as: "order_request",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
OrderRequest.hasMany(Sale, { foreignKey: "order_request_id", as: "sales" });

// Sale-SaleItem
Sale.hasMany(SaleItem, { foreignKey: "sale_id", as: "items" });
SaleItem.belongsTo(Sale, { foreignKey: "sale_id", as: "sale" });

// SaleItem-Product
SaleItem.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Product.hasMany(SaleItem, { foreignKey: "product_id", as: "sale_items" });

// ActivityLog-User
ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(ActivityLog, { foreignKey: "user_id", as: "activity_logs" });

// Notification-User
Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });

// ApproveRequest - OrderRequest (one-to-one)
ApproveRequest.belongsTo(OrderRequest, {
  foreignKey: "order_request_id",
  as: "order_request",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
OrderRequest.hasOne(ApproveRequest, {
  foreignKey: "order_request_id",
  as: "approve_request",
});

// ConfirmDelivery - OrderRequest (one-to-one)
ConfirmDelivery.belongsTo(OrderRequest, {
  foreignKey: "order_request_id",
  as: "order_request",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
OrderRequest.hasOne(ConfirmDelivery, {
  foreignKey: "order_request_id",
  as: "confirm_delivery",
});

// Stock-Product
Stock.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Product.hasMany(Stock, { foreignKey: "product_id", as: "stocks" });

// Stock-User
Stock.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
User.hasMany(Stock, { foreignKey: "user_id", as: "stocks" });

// Expense-User
Expense.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
User.hasMany(Expense, { foreignKey: "user_id", as: "expenses" });

module.exports = {
  User,
  Sale,
  Stock,
  Expense,
  Product,
  Category,
  Supplier,
  SaleItem,
  Permission,
  ActivityLog,
  OrderRequest,
  Notification,
  OrderRequestItem,
  ApproveRequest,
  ConfirmDelivery,
};

// Express-validator middleware for validating order request creation
const { body } = require("express-validator");

const validateOrderRequest = [
  body("supplier_id")
    .isString()
    .isLength({ min: 24, max: 24 })
    .withMessage("Supplier ID must be a 24-character string"),
  body("delivery_date").notEmpty().withMessage("Delivery date is required"),
  body("orderItems")
    .isArray({ min: 1 })
    .withMessage("At least one order item is required"),
  body("orderItems.*.product_id")
    .isString()
    .isLength({ min: 24, max: 24 })
    .withMessage("Product ID must be a 24-character string for each item"),
  body("orderItems.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer for each item"),
  body("orderItems.*.unit_price")
    .optional()
    .isNumeric()
    .withMessage("Unit price must be a number for each item"),
];

module.exports = {
  validateOrderRequest,
};

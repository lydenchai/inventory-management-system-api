// Express-validator middleware for validating stock in/out creation
const { body } = require("express-validator");

const validateStock = [
  body("product_id")
    .isString()
    .isLength({ min: 24, max: 24 })
    .withMessage("Product ID must be a 24-character string"),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("type")
    .isIn(["in", "out"])
    .withMessage("Type must be 'in' or 'out'"),
  body("location")
    .optional()
    .isString(),
  body("batch_number")
    .optional()
    .isString(),
  body("reason")
    .isString()
    .notEmpty()
    .withMessage("Reason is required"),
  body("note")
    .optional()
    .isString(),
  body("user_id")
    .optional()
    .isString(),
  body("completed_at")
    .optional()
    .isISO8601(),
];

module.exports = {
  validateStock,
};

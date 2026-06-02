// Express-validator middleware for validating product creation
const { body } = require("express-validator");

const validateProduct = [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Product name is required"),
  body("category")
    .isString()
    .isLength({ min: 24, max: 24 })
    .withMessage("Category must be a 24-character string"),
  body("supplier")
    .isString()
    .isLength({ min: 24, max: 24 })
    .withMessage("Supplier must be a 24-character string"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("cost_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Cost Price must be a non-negative number"),
];

module.exports = {
  validateProduct,
};

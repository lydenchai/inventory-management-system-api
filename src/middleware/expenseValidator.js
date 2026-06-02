const { body } = require("express-validator");

const validateExpense = [
  body("description")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Description is required"),
  body("amount")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
  body("date")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Invalid date format"),
];

module.exports = {
  validateExpense,
};

// Express-validator middleware for validating category creation
const { body } = require("express-validator");

const validateCategory = [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Category name is required"),
];

module.exports = {
  validateCategory,
};

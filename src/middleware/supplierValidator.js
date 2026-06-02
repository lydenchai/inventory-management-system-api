// Express-validator middleware for validating supplier creation
const { body } = require('express-validator');


const validateSupplier = [
  body('company_name').isString().trim().notEmpty().withMessage('Company name is required'),
  body('location').isString().trim().notEmpty().withMessage('Location is required'),
  body('contact_person').isString().trim().notEmpty().withMessage('Contact person is required'),
  body('contact_position').isString().trim().notEmpty().withMessage('Contact position is required'),
  body('contact_email').optional({ nullable: true }).isString().trim(),
  body('contact_phone').isString().trim().notEmpty().withMessage('Contact phone is required'),
  body('address').isObject().withMessage('Address is required'),
  body('status').isString().trim().notEmpty().withMessage('Status is required'),
];

module.exports = {
  validateSupplier,
};

const Joi = require('joi');
const ApiError = require('../utils/ApiError');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      // Create error with full message so user sees which fields failed
      const message = errors.map(e => `${e.field}: ${e.message}`).join('; ');
      const err = new ApiError(400, `Validation error - ${message}`);
      err.errors = errors; // attach array explicitly
      
      return next(err);
    }

    req[property] = value;
    next();
  };
};

const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

const commonSchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),
  id: Joi.object({
    id: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/)
  }),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180)
  })
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
  commonSchemas
};
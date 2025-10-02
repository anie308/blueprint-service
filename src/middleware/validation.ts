import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

type ValidationTarget = 'body' | 'params' | 'query';

interface ValidationOptions {
  target: ValidationTarget;
  schema: Joi.ObjectSchema;
  allowUnknown?: boolean;
}

// Generic validation middleware
export const validate = (options: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { target, schema, allowUnknown = false } = options;
    
    const dataToValidate = req[target];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const validationError = new AppError(`Validation error: ${errorMessage}`, 400, {
        validationErrors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
      
      return next(validationError);
    }

    // Replace the original data with validated/sanitized data
    req[target] = value;
    next();
  };
};

// Specific validation middleware for common cases
export const validateBody = (schema: Joi.ObjectSchema, allowUnknown: boolean = false) => {
  return validate({ target: 'body', schema, allowUnknown });
};

export const validateParams = (schema: Joi.ObjectSchema, allowUnknown: boolean = false) => {
  return validate({ target: 'params', schema, allowUnknown });
};

export const validateQuery = (schema: Joi.ObjectSchema, allowUnknown: boolean = false) => {
  return validate({ target: 'query', schema, allowUnknown });
};

// Middleware to validate MongoDB ObjectId parameters
export const validateObjectId = (paramName: string = 'id') => {
  const schema = Joi.object({
    [paramName]: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': `Invalid ${paramName} format`
      })
  });

  return validateParams(schema);
};

// Middleware to validate multiple ObjectId parameters
export const validateObjectIds = (...paramNames: string[]) => {
  const schemaObject: { [key: string]: Joi.StringSchema } = {};
  
  paramNames.forEach(paramName => {
    schemaObject[paramName] = Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': `Invalid ${paramName} format`
      });
  });

  const schema = Joi.object(schemaObject);
  return validateParams(schema);
};

// Middleware to validate pagination query parameters
export const validatePagination = () => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('newest', 'oldest', 'popular', 'views').default('newest')
  }).unknown(true); // Allow other query parameters

  return validateQuery(schema, true);
};

// Middleware to validate search query parameters
export const validateSearch = () => {
  const schema = Joi.object({
    q: Joi.string().min(1).max(100),
    tags: Joi.string(),
    location: Joi.string(),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'freelance'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('newest', 'oldest', 'popular', 'views').default('newest')
  }).unknown(true);

  return validateQuery(schema, true);
};
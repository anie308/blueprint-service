import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: any;
  stack?: string;
}

// Handle different types of errors
const handleCastErrorDB = (err: mongoose.Error.CastError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any): AppError => {
  const duplicateFields = Object.keys(err.keyValue);
  const message = `${duplicateFields.join(', ')} already exists. Please use different values.`;
  return new AppError(message, 400, { fields: duplicateFields });
};

const handleValidationErrorDB = (err: mongoose.Error.ValidationError): AppError => {
  const errors = Object.values(err.errors).map(val => val.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400, { validationErrors: errors });
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again!', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

// Send error response in development
const sendErrorDev = (err: AppError, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    message: err.message,
    error: err.name,
    details: err.details,
    ...(err.stack && { stack: err.stack })
  };

  res.status(err.statusCode).json(errorResponse);
};

// Send error response in production
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: err.message
    };

    if (err.details) {
      errorResponse.details = err.details;
    }

    res.status(err.statusCode).json(errorResponse);
  } else {
    // Programming or unknown error: don't leak error details
    console.error('ERROR:', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

// Global error handling middleware
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // Handle specific error types
  if (error.name === 'CastError') {
    error = handleCastErrorDB(error);
  }
  
  if (error.code === 11000) {
    error = handleDuplicateFieldsDB(error);
  }
  
  if (error.name === 'ValidationError') {
    error = handleValidationErrorDB(error);
  }
  
  if (error.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  
  if (error.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Send appropriate error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Catch async errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled routes
export const handleNotFound = (req: Request, res: Response, next: NextFunction): void => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

// Success response helper
export const sendSuccessResponse = (
  res: Response,
  statusCode: number = 200,
  message: string,
  data?: any
): void => {
  const response: any = {
    success: true,
    message
  };

  if (data !== undefined) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

// Paginated response helper
export const sendPaginatedResponse = (
  res: Response,
  statusCode: number = 200,
  message: string,
  data: any[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination
  });
};
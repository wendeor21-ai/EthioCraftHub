/**
 * Error Handling Middleware for EthioCraft Global
 *
 * Provides centralized error handling with:
 * - Consistent error response format
 * - Environment-specific error details
 * - Error logging and monitoring
 * - Security-conscious error messages
 */

const { Prisma } = require('@prisma/client');

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle validation errors (Mongoose-style or Prisma)
 */
const handleValidationError = (error) => {
  const errors = error.errors
    ? Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }))
    : [];

  return {
    statusCode: 400,
    error: 'Validation Error',
    message: 'Invalid input data provided',
    code: 'VALIDATION_ERROR',
    details: errors,
  };
};

/**
 * Handle duplicate key errors
 */
const handleDuplicateKeyError = (error) => {
  const field = error.meta?.target?.[0] || error.keyValue ? Object.keys(error.keyValue)[0] : 'field';
  const value = error.keyValue?.[field] || error.meta?.target?.[1];

  let message = `${field} '${value}' already exists`;

  if (field === 'name') {
    message = `A product with the name '${value}' already exists. Please use a unique name.`;
  } else if (field === 'slug') {
    message = `A product with this URL slug already exists. Try changing the product name.`;
  } else if (field === 'email') {
    message = `An account with email '${value}' already exists.`;
  }

  return {
    statusCode: 409,
    error: 'Duplicate Entry',
    message,
    code: 'DUPLICATE_ENTRY',
    details: { field, value },
  };
};

/**
 * Handle invalid ID / cast errors
 */
const handleCastError = (error) => {
  return {
    statusCode: 400,
    error: 'Invalid Data Format',
    message: `Invalid ${error.path}: ${error.value}`,
    code: 'INVALID_FORMAT',
    details: {
      field: error.path,
      value: error.value,
      expectedType: error.kind,
    },
  };
};

/**
 * Handle Prisma errors
 */
const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return handleDuplicateKeyError({
        keyValue: { [error.meta?.target?.[0] || 'field']: error.meta?.target?.[1] },
      });
    }
    if (error.code === 'P2003') {
      return {
        statusCode: 400,
        error: 'Reference Error',
        message: 'Referenced record does not exist',
        code: 'FOREIGN_KEY_ERROR',
      };
    }
    if (error.code === 'P2025') {
      return {
        statusCode: 404,
        error: 'Not Found',
        message: 'Record not found',
        code: 'NOT_FOUND',
      };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // Log full Prisma validation error for debugging
    console.error('[Prisma Validation Error]', error.message);
    return {
      statusCode: 400,
      error: 'Validation Error',
      message: 'Invalid data provided to database',
      code: 'VALIDATION_ERROR',
      // Include truncated Prisma message in dev for debugging
      ...(process.env.NODE_ENV !== 'production' && { prismaDetail: error.message?.slice(0, 500) }),
    };
  }

  return null;
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
  const errorMap = {
    JsonWebTokenError: {
      statusCode: 401,
      message: 'Invalid authentication token',
      code: 'INVALID_TOKEN',
    },
    TokenExpiredError: {
      statusCode: 401,
      message: 'Authentication token has expired',
      code: 'TOKEN_EXPIRED',
    },
    NotBeforeError: {
      statusCode: 401,
      message: 'Authentication token not active yet',
      code: 'TOKEN_NOT_ACTIVE',
    },
  };

  const errorInfo = errorMap[error.name] || {
    statusCode: 401,
    message: 'Authentication failed',
    code: 'AUTH_ERROR',
  };

  return {
    ...errorInfo,
    error: 'Authentication Error',
  };
};

/**
 * Handle file upload errors
 */
const handleFileUploadError = (error) => {
  const errorMap = {
    LIMIT_FILE_SIZE: {
      statusCode: 413,
      message: 'File size too large',
      code: 'FILE_TOO_LARGE',
    },
    LIMIT_FILE_COUNT: {
      statusCode: 400,
      message: 'Too many files uploaded',
      code: 'TOO_MANY_FILES',
    },
    LIMIT_UNEXPECTED_FILE: {
      statusCode: 400,
      message: 'Unexpected file field',
      code: 'UNEXPECTED_FILE',
    },
  };

  const errorInfo = errorMap[error.code] || {
    statusCode: 400,
    message: 'File upload failed',
    code: 'UPLOAD_ERROR',
  };

  return {
    ...errorInfo,
    error: 'File Upload Error',
  };
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    timestamp: new Date().toISOString(),
  });

  let response = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown',
  };

  const prismaResponse = handlePrismaError(err);

  if (err.name === 'ValidationError') {
    response = handleValidationError(err);
  } else if (prismaResponse) {
    response = prismaResponse;
  } else if (err.code === 11000) {
    response = handleDuplicateKeyError(err);
  } else if (err.name === 'CastError') {
    response = handleCastError(err);
  } else if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
    response = handleJWTError(err);
  } else if (err.code && err.code.startsWith('LIMIT_')) {
    response = handleFileUploadError(err);
  } else if (err.isOperational) {
    response = {
      error: err.message,
      message: err.message,
      code: err.code || 'OPERATIONAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
    };
  }

  const statusCode = response.statusCode || err.statusCode || 500;
  delete response.statusCode;

  if (process.env.NODE_ENV === 'production') {
    delete response.stack;

    if (statusCode === 500) {
      response = {
        error: 'Internal Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown',
      };
    }
  } else {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const createValidationError = (message, field = null, value = null) => {
  const error = new AppError(message, 400, 'VALIDATION_ERROR');
  if (field) {
    error.details = { field, value };
  }
  return error;
};

const createAuthError = (message = 'Authentication required', code = 'AUTH_REQUIRED') => {
  return new AppError(message, 401, code);
};

const createForbiddenError = (message = 'Access forbidden', code = 'ACCESS_FORBIDDEN') => {
  return new AppError(message, 403, code);
};

const createNotFoundError = (resource = 'Resource', code = 'NOT_FOUND') => {
  return new AppError(`${resource} not found`, 404, code);
};

const createConflictError = (message, code = 'CONFLICT') => {
  return new AppError(message, 409, code);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createValidationError,
  createAuthError,
  createForbiddenError,
  createNotFoundError,
  createConflictError,
};

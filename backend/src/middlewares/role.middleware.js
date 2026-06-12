import ApiError from '../utils/ApiError.js';

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        throw new ApiError(401, 'Unauthorized: User not authenticated properly');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ApiError(403, 'Forbidden: You do not have permission to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

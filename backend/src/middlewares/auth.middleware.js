import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';

export const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized: Missing or invalid token format');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach decoded payload to req.user (id, username, role)
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Unauthorized: Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Unauthorized: Invalid token'));
    } else {
      next(error);
    }
  }
};

import { UserRole } from "./models/userModel";

declare global {
  namespace Express {
    interface Request {
      // Only attach what you actually store in the middleware
      user?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

// Generic API response
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// For paginated endpoints
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Validation error structure
export interface ValidationError {
  field: string;
  message: string;
}

// Service response for internal use
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

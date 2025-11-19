import { UserRole } from "./models/userModel";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        userName: string;
        role: UserRole;
      };
    }
  }
}

// Export other common types you might need
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}
import { UserRole } from "./models/userModel";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        role: UserRole;
      };
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime?: Date;
      };
    }
  }
}

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

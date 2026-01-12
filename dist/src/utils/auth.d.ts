import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateToken: (payload: any) => string;
export declare const verifyToken: (token: string) => string | jwt.JwtPayload;
export declare const generateRefreshToken: (payload: any) => string;
export declare const verifyRefreshToken: (token: string) => string | jwt.JwtPayload;
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map
import { Request, Response, NextFunction } from "express";
import { UserRole } from "../users/model/userModel.js";
export declare const checkRole: (roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkSuperAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkOwnership: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authorization.d.ts.map
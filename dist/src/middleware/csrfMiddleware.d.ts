import { Request, Response, NextFunction } from "express";
declare module "express-serve-static-core" {
    interface Request {
        session: {
            csrfToken?: string;
            [key: string]: any;
        };
    }
}
export declare const generateCsrfToken: (req: Request) => string;
export declare const validateCsrfToken: (req: Request) => boolean;
export declare const csrfProtection: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=csrfMiddleware.d.ts.map
import { Request, Response } from "express";
export declare const signUpController: (req: Request, res: Response) => Promise<void>;
export declare const signInController: (req: Request, res: Response) => Promise<void>;
export declare const logoutController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const refreshTokenController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createAdminController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createSuperAdminController: (req: Request, res: Response) => Promise<void>;
export declare const deactivateAdminController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const reactivateAdminController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const forgotPasswordController: (req: Request, res: Response) => Promise<void>;
export declare const effectForgotPasswordController: (req: Request, res: Response) => Promise<void>;
export declare const resetPasswordController: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map
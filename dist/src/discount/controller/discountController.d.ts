import { Request, Response } from "express";
export declare const createDiscount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllDiscounts: (req: Request, res: Response) => Promise<void>;
export declare const getActiveDiscounts: (req: Request, res: Response) => Promise<void>;
export declare const getDiscountById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateDiscount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleDiscountStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteDiscount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const validateDiscount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=discountController.d.ts.map
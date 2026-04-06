import { Request, Response } from "express";
export declare const createShipping: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateShippingTracking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateShippingStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getShippingById: (req: Request, res: Response) => Promise<void>;
export declare const getShippingByOrderId: (req: Request, res: Response) => Promise<void>;
export declare const getAllShipping: (req: Request, res: Response) => Promise<void>;
export declare const filterShipping: (req: Request, res: Response) => Promise<void>;
export declare const getShippingNeedingInvoice: (req: Request, res: Response) => Promise<void>;
export declare const getPendingShipping: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=shippingController.d.ts.map
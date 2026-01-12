import { Request, Response } from "express";
export declare const createOrder: (req: Request, res: Response) => Promise<void>;
export declare const updateOrder: (req: Request, res: Response) => Promise<void>;
export declare const searchByOrderNumber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteOrder: (req: Request, res: Response) => Promise<void>;
export declare const getOrderById: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=orderController.d.ts.map
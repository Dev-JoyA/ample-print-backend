import { Request, Response } from "express";
export declare const createInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createShippingInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateInvoice: (req: Request, res: Response) => Promise<void>;
export declare const deleteInvoice: (req: Request, res: Response) => Promise<void>;
export declare const sendInvoiceToCustomer: (req: Request, res: Response) => Promise<void>;
export declare const getAllInvoices: (req: Request, res: Response) => Promise<void>;
export declare const getInvoiceById: (req: Request, res: Response) => Promise<void>;
export declare const getInvoiceByNumber: (req: Request, res: Response) => Promise<void>;
export declare const getInvoiceByOrderId: (req: Request, res: Response) => Promise<void>;
export declare const getInvoiceByOrderNumber: (req: Request, res: Response) => Promise<void>;
export declare const getUserInvoices: (req: Request, res: Response) => Promise<void>;
export declare const filterInvoices: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=invoiceController.d.ts.map
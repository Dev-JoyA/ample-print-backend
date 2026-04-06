import { Request, Response } from "express";
export declare const uploadBriefFiles: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const submitCustomerBrief: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adminRespondToBrief: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getBriefByOrderAndProduct: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCustomerBriefById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCustomerBrief: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserCustomerBriefs: (req: Request, res: Response) => Promise<void>;
export declare const getAdminCustomerBriefs: (req: Request, res: Response) => Promise<void>;
export declare const checkAdminResponseStatus: (req: Request, res: Response) => Promise<void>;
export declare const markBriefAsViewed: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getOrderBriefStatus: (req: Request, res: Response) => Promise<void>;
export declare const getAllBriefsByOrderId: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=customerBriefController.d.ts.map
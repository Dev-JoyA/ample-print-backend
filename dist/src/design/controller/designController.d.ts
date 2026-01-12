import { Request, Response } from "express";
export declare const createDesignController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatedDesignController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteDesignController: (req: Request, res: Response) => Promise<void>;
export declare const approveDesignController: (req: Request, res: Response) => Promise<void>;
export declare const getDesignByIdController: (req: Request, res: Response) => Promise<void>;
export declare const getUserController: (req: Request, res: Response) => Promise<void>;
export declare const getDesignByorderIdController: (req: Request, res: Response) => Promise<void>;
export declare const getDesignByProductIdController: (req: Request, res: Response) => Promise<void>;
export declare const getAllDesignsController: (req: Request, res: Response) => Promise<void>;
export declare const filterDesignController: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=designController.d.ts.map
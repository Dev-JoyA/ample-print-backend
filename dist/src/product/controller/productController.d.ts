import { Request, Response } from "express";
export declare const createCollection: (req: Request, res: Response) => Promise<void>;
export declare const updateCollection: (req: Request, res: Response) => Promise<void>;
export declare const deleteCollection: (req: Request, res: Response) => Promise<void>;
export declare const getCollectionsPaginated: (req: Request, res: Response) => Promise<void>;
export declare const createProduct: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProduct: (req: Request, res: Response) => Promise<void>;
export declare const deleteProduct: (req: Request, res: Response) => Promise<void>;
export declare const getProductById: (req: Request, res: Response) => Promise<void>;
export declare const getProductsPaginated: (req: Request, res: Response) => Promise<void>;
export declare const filterProducts: (req: Request, res: Response) => Promise<void>;
export declare const getProductsByCollectionId: (req: Request, res: Response) => Promise<void>;
export declare const searchProductsByName: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=productController.d.ts.map
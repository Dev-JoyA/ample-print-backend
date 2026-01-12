import { Request, Response } from "express";
export declare function getAllUsersController(req: Request, res: Response): Promise<void>;
export declare function getUserByIdController(req: Request, res: Response): Promise<void>;
export declare function updateProfileController(req: Request, res: Response): Promise<void>;
export declare function deleteUserController(req: Request, res: Response): Promise<void>;
export declare function changeUserRoleController(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function toggleUserActivenessController(req: Request, res: Response): Promise<void>;
export declare function getUserAddressController(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=userController.d.ts.map
import { IDesign } from "../model/designModel.js";
import { Server } from "socket.io";
export interface IDesignFilter {
    userId?: string;
    orderId?: string;
    productId?: string;
    uploadedBy?: string;
    isApproved?: boolean;
    minVersion?: number;
    maxVersion?: number;
    startDate?: Date;
    endDate?: Date;
}
export declare const uploadDesign: (id: string, data: IDesign, io: Server) => Promise<IDesign>;
export declare const updateDesign: (id: string, data: Partial<IDesign>, io: Server) => Promise<IDesign>;
export declare const deleteDesign: (id: string) => Promise<string>;
export declare const approveDesign: (id: string) => Promise<IDesign>;
export declare const getDesignById: (id: string) => Promise<IDesign>;
export declare const getUserDesigns: (userId: string) => Promise<IDesign[]>;
export declare const getDesignsByOrderId: (orderId: string) => Promise<IDesign[]>;
export declare const filterDesigns: (filters: IDesignFilter) => Promise<(import("mongoose").Document<unknown, {}, IDesign, {}, {}> & IDesign & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
})[]>;
export declare const getDesignByProductId: (productId: string) => Promise<IDesign[]>;
export declare const getAllDesigns: () => Promise<IDesign[]>;
//# sourceMappingURL=designService.d.ts.map
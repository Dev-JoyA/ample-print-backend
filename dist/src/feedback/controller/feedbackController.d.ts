import { Request, Response } from "express";
export declare const createFeedback: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const respondToFeedback: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteFeedback: (req: Request, res: Response) => Promise<void>;
export declare const getPendingFeedback: (req: Request, res: Response) => Promise<void>;
export declare const getAllFeedback: (req: Request, res: Response) => Promise<void>;
export declare const filterFeedback: (req: Request, res: Response) => Promise<void>;
export declare const getFeedbackById: (req: Request, res: Response) => Promise<void>;
export declare const getFeedbackByOrderId: (req: Request, res: Response) => Promise<void>;
export declare const getUserFeedback: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=feedbackController.d.ts.map
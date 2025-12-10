import * as orderService from "../service/orderService.js";
import { Request, Response } from "express";
import {OrderData, IOrderModel} from "../models/orderModel.js"

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

export const createOrder = async (req: Request, res: Response) => {
    try {
        const io = getIO(req);
        const userId = req.params.id;
        const data: OrderData = req.body;
        const order = await orderService.createOrder(userId,data, io)
        res.status(201).json({ success: true, order });
    }catch(err: any){
        res.status(400).json({ success: false, message: err.message});
    }
}


export const updateOrder = async (req: Request, res: Response) => {
    try {
       const data: Partial<IOrderModel> = req.body;
        console.log("Hello wo")
        data.id = req.params.id;
        const user = req.user as any;
        if(!user) throw new Error("no user found");
        if(user._id != data.userId) {
            res.status(400).json({success: false, message: "Unauthorised, Only the user can update the order"})
        }
        const order = await orderService.updateOrder(data);
        res.status(200).json({ success: true, order });
    }catch(err: any){
        res.status(400).json({ success: false, message: err.message});
    }
}




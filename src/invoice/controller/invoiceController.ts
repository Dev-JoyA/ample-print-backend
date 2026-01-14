import { createInvoice} from "../service/invoiceService.js"
import { Request, Response } from "express";

export const createInvoiceController = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const invoiceData = req.body;

        const newInvoice = await createInvoice(orderId, invoiceData);

        res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            data: newInvoice
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: (error as Error).message
        });
    }
}
import * as invoiceService from "../service/invoiceService.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
export const createInvoice = async (req, res) => {
    try {
        const io = getIO(req);
        const user = req.user;
        const { orderId } = req.params;
        const { paymentType, depositAmount, discount, dueDate, notes, paymentInstructions, items, // Add this
         } = req.body;
        // Validate required fields
        if (!paymentType || !dueDate) {
            return res.status(400).json({
                success: false,
                message: "paymentType and dueDate are required",
            });
        }
        if (!["full", "part"].includes(paymentType)) {
            return res.status(400).json({
                success: false,
                message: "paymentType must be 'full' or 'part'",
            });
        }
        const invoice = await invoiceService.createInvoice(orderId, {
            paymentType,
            depositAmount,
            discount,
            dueDate: new Date(dueDate),
            notes,
            paymentInstructions,
            items, // Pass items to service
        }, user._id, io);
        res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== CREATE INVOICE (Super Admin only) ====================
// export const createInvoice = async (req: Request, res: Response) => {
//   try {
//     const io = getIO(req);
//     const user = req.user as { _id: string; role: string };
//     const { orderId } = req.params;
//     const {
//       paymentType,
//       depositAmount,
//       discount,
//       dueDate,
//       notes,
//       paymentInstructions,
//     } = req.body;
//     // Validate required fields
//     if (!paymentType || !dueDate) {
//       return res.status(400).json({
//         success: false,
//         message: "paymentType and dueDate are required",
//       });
//     }
//     if (!["full", "part"].includes(paymentType)) {
//       return res.status(400).json({
//         success: false,
//         message: "paymentType must be 'full' or 'part'",
//       });
//     }
//     const invoice = await invoiceService.createInvoice(
//       orderId,
//       {
//         paymentType,
//         depositAmount,
//         discount,
//         dueDate: new Date(dueDate),
//         notes,
//         paymentInstructions,
//       },
//       user._id,
//       io,
//     );
//     res.status(201).json({
//       success: true,
//       message: "Invoice created successfully",
//       data: invoice,
//     });
//   } catch (error: any) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// ==================== CREATE SHIPPING INVOICE (Admin only) ====================
export const createShippingInvoice = async (req, res) => {
    try {
        const io = getIO(req);
        const user = req.user;
        const { orderId, shippingId } = req.params;
        const { shippingCost, dueDate, notes } = req.body;
        // Validate required fields
        if (!shippingCost || !dueDate) {
            return res.status(400).json({
                success: false,
                message: "shippingCost and dueDate are required",
            });
        }
        const invoice = await invoiceService.createShippingInvoice(orderId, shippingId, {
            shippingCost,
            dueDate: new Date(dueDate),
            notes,
        }, user._id, io);
        res.status(201).json({
            success: true,
            message: "Shipping invoice created successfully",
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== UPDATE INVOICE ====================
export const updateInvoice = async (req, res) => {
    try {
        const io = getIO(req);
        const user = req.user;
        const { invoiceId } = req.params;
        const updateData = req.body;
        const invoice = await invoiceService.updateInvoice(invoiceId, updateData, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: "Invoice updated successfully",
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== DELETE INVOICE ====================
export const deleteInvoice = async (req, res) => {
    try {
        const io = getIO(req);
        const user = req.user;
        const { invoiceId } = req.params;
        const result = await invoiceService.deleteInvoice(invoiceId, user.role, io);
        res.status(200).json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== SEND INVOICE TO CUSTOMER ====================
export const sendInvoiceToCustomer = async (req, res) => {
    try {
        const io = getIO(req);
        const user = req.user;
        const { invoiceId } = req.params;
        const invoice = await invoiceService.sendInvoiceToCustomer(invoiceId, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: "Invoice sent to customer successfully",
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET ALL INVOICES (Admin) ====================
export const getAllInvoices = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await invoiceService.getAllInvoices(page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET INVOICE BY ID ====================
export const getInvoiceById = async (req, res) => {
    try {
        const user = req.user;
        const { invoiceId } = req.params;
        const invoice = await invoiceService.getInvoiceById(invoiceId, user._id, user.role);
        res.status(200).json({
            success: true,
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET INVOICE BY INVOICE NUMBER ====================
export const getInvoiceByNumber = async (req, res) => {
    try {
        const user = req.user;
        const { invoiceNumber } = req.params;
        const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber, user._id, user.role);
        res.status(200).json({
            success: true,
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET INVOICE BY ORDER ID ====================
export const getInvoiceByOrderId = async (req, res) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        const invoice = await invoiceService.getInvoiceByOrderId(orderId, user._id, user.role);
        res.status(200).json({
            success: true,
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET INVOICE BY ORDER NUMBER ====================
export const getInvoiceByOrderNumber = async (req, res) => {
    try {
        const user = req.user;
        const { orderNumber } = req.params;
        const invoice = await invoiceService.getInvoiceByOrderNumber(orderNumber, user._id, user.role);
        res.status(200).json({
            success: true,
            data: invoice,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET USER INVOICES ====================
export const getUserInvoices = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await invoiceService.getUserInvoices(user._id, page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== FILTER INVOICES (Admin) ====================
export const filterInvoices = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            invoiceType: req.query.invoiceType,
            startDate: req.query.startDate
                ? new Date(req.query.startDate)
                : undefined,
            endDate: req.query.endDate
                ? new Date(req.query.endDate)
                : undefined,
            minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
            maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
            userId: req.query.userId,
            orderId: req.query.orderId,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 10,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
        };
        const result = await invoiceService.filterInvoices(filters);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=invoiceController.js.map
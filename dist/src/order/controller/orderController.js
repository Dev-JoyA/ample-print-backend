import * as orderService from "../service/orderService.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
export const createOrder = async (req, res) => {
    try {
        const io = getIO(req);
        const userId = req.params.id;
        const data = req.body;
        const order = await orderService.createOrder(userId, data, io);
        res.status(201).json({ success: true, order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
export const updateOrder = async (req, res) => {
    try {
        const data = req.body;
        console.log("Hello wo");
        data.id = req.params.id;
        const user = req.user;
        if (!user)
            throw new Error("no user found");
        if (user._id != data.userId) {
            res.status(400).json({ success: false, message: "Unauthorised, Only the user can update the order" });
        }
        const order = await orderService.updateOrder(data);
        res.status(200).json({ success: true, order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
export const searchByOrderNumber = async (req, res) => {
    try {
        const orderNumber = req.params.orderNumber;
        const order = await orderService.searchByOrderNumber(orderNumber);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        res.status(200).json({ success: true, order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
export const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await orderService.deleteOrder(id);
        res.status(20).json({ success: true, message: response });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orderService.getOrderById(id);
        res.status(200).json({ success: true, order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
//# sourceMappingURL=orderController.js.map
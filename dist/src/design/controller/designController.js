import * as designService from "../service/designService.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
export const createDesignController = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = req.user;
        const files = req.files;
        const io = getIO(req);
        if (!files || files.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "At least one image is required." });
        }
        const data = {
            ...req.body,
            uploadedBy: admin._id,
            designUrl: `/uploads/${files[0].filename}`,
            filename: `${files[0].filename}`,
            otherImage: files.map((file) => `/uploads/${file.filename}`),
            filenames: files.map((file) => file.filename),
        };
        const design = await designService.uploadDesign(id, data, io);
        const populatedDesign = await design.populate("uploadedBy", "fullname email");
        res.status(201).json({ success: true, populatedDesign });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const updatedDesignController = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = req.user;
        const files = req.files;
        const io = getIO(req);
        if (!files || files.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "At least one image is required." });
        }
        const updatedData = {
            ...req.body,
            uploadedBy: admin._id,
        };
        if (files && files.length > 0) {
            updatedData.designUrl = `/uploads/${files[0].filename}`;
            updatedData.filename = `${files[0].filename}`;
            updatedData.otherImage = files.map((file) => `/uploads/${file.filename}`);
            updatedData.filenames = files.map((file) => file.filename);
        }
        const update = await designService.updateDesign(id, updatedData, io);
        const populateDesign = await update.populate("uploadedBy", "fullname email");
        res.status(200).json({ success: true, populateDesign });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const deleteDesignController = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteDesign = await designService.deleteDesign(id);
        res.status(200).json({ success: true, deleteDesign });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const approveDesignController = async (req, res) => {
    try {
        const { id } = req.params;
        const design = await designService.approveDesign(id);
        res.status(200).json({ success: true, design });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getDesignByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const design = await designService.getDesignById(id);
        res.status(200).json({ success: true, design });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getUserController = async (req, res) => {
    try {
        const { id } = req.params;
        const design = await designService.getUserDesigns(id);
        res.status(200).json({ success: true, design });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getDesignByorderIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const design = await designService.getDesignsByOrderId(id);
        res.status(200).json({ success: true, design });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getDesignByProductIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const design = await designService.getDesignByProductId(id);
        res.status(200).json({ success: true, design });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getAllDesignsController = async (req, res) => {
    try {
        const design = await designService.getAllDesigns();
        res.status(200).json({ success: true, design });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const filterDesignController = async (req, res) => {
    try {
        const data = req.body;
        const design = await designService.filterDesigns(data);
        res.status(200).json({ success: true, design });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=designController.js.map
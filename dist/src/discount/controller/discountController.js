import { Discount } from '../model/discountModel.js';
// Create discount
export const createDiscount = async (req, res) => {
    try {
        const { code, type, value, active, minOrderAmount, maxDiscountAmount, validFrom, validUntil, usageLimit } = req.body;
        // Check if discount code already exists
        const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
        if (existingDiscount) {
            return res.status(400).json({
                success: false,
                message: 'Discount code already exists',
            });
        }
        const discount = await Discount.create({
            code: code.toUpperCase(),
            type,
            value,
            active: active !== undefined ? active : true,
            minOrderAmount,
            maxDiscountAmount,
            validFrom,
            validUntil,
            usageLimit,
            usedCount: 0,
        });
        res.status(201).json({
            success: true,
            message: 'Discount created successfully',
            data: discount,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Get all discounts (with filters)
export const getAllDiscounts = async (req, res) => {
    try {
        const { active, type } = req.query;
        const query = {};
        if (active !== undefined) {
            query.active = active === 'true';
        }
        if (type) {
            query.type = type;
        }
        const discounts = await Discount.find(query).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: discounts.length,
            discounts,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Get active discounts (for checkout)
export const getActiveDiscounts = async (req, res) => {
    try {
        const now = new Date();
        const query = {
            active: true,
            $and: [
                {
                    $or: [
                        { validFrom: { $lte: now } },
                        { validFrom: null },
                    ],
                },
                {
                    $or: [
                        { validUntil: { $gte: now } },
                        { validUntil: null },
                    ],
                },
            ],
        };
        const discounts = await Discount.find(query).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            discounts,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Get discount by ID
export const getDiscountById = async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id);
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found',
            });
        }
        res.status(200).json({
            success: true,
            data: discount,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Update discount
export const updateDiscount = async (req, res) => {
    try {
        const { code, type, value, active, minOrderAmount, maxDiscountAmount, validFrom, validUntil, usageLimit } = req.body;
        // Check if code is being changed and if it already exists
        if (code) {
            const existingDiscount = await Discount.findOne({
                code: code.toUpperCase(),
                _id: { $ne: req.params.id }
            });
            if (existingDiscount) {
                return res.status(400).json({
                    success: false,
                    message: 'Discount code already exists',
                });
            }
        }
        const discount = await Discount.findByIdAndUpdate(req.params.id, {
            ...(code && { code: code.toUpperCase() }),
            ...(type && { type }),
            ...(value !== undefined && { value }),
            ...(active !== undefined && { active }),
            ...(minOrderAmount !== undefined && { minOrderAmount }),
            ...(maxDiscountAmount !== undefined && { maxDiscountAmount }),
            ...(validFrom && { validFrom }),
            ...(validUntil && { validUntil }),
            ...(usageLimit !== undefined && { usageLimit }),
        }, { new: true, runValidators: true });
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Discount updated successfully',
            data: discount,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Toggle discount active status
export const toggleDiscountStatus = async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id);
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found',
            });
        }
        discount.active = !discount.active;
        await discount.save();
        res.status(200).json({
            success: true,
            message: `Discount ${discount.active ? 'activated' : 'deactivated'} successfully`,
            data: discount,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Delete discount
export const deleteDiscount = async (req, res) => {
    try {
        const discount = await Discount.findByIdAndDelete(req.params.id);
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Discount deleted successfully',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Validate discount code (public endpoint for checkout)
export const validateDiscount = async (req, res) => {
    try {
        const { code, amount } = req.body;
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Discount code is required',
            });
        }
        const discount = await Discount.findOne({ code: code.toUpperCase(), active: true });
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or inactive discount code',
            });
        }
        const now = new Date();
        // Check validity period
        if (discount.validFrom && discount.validFrom > now) {
            return res.status(400).json({
                success: false,
                message: 'Discount code is not yet active',
            });
        }
        if (discount.validUntil && discount.validUntil < now) {
            return res.status(400).json({
                success: false,
                message: 'Discount code has expired',
            });
        }
        // Check minimum order amount
        if (discount.minOrderAmount && amount < discount.minOrderAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount of ${discount.minOrderAmount} required for this discount`,
            });
        }
        // Check usage limit
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'Discount code usage limit reached',
            });
        }
        // Calculate discount amount
        let discountAmount = 0;
        if (discount.type === 'percentage') {
            discountAmount = (amount * discount.value) / 100;
            if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
                discountAmount = discount.maxDiscountAmount;
            }
        }
        else {
            discountAmount = discount.value;
        }
        res.status(200).json({
            success: true,
            message: 'Discount code is valid',
            data: {
                code: discount.code,
                type: discount.type,
                value: discount.value,
                discountAmount,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=discountController.js.map
import Upload from "../models/userFlow.js";
import User from "../models/userModel.js";
import { initializePayment } from "../utils/paymentGateway.js";

export const uploadDetails = async (req, res) => {
    try {
        const { userId, logo, voiceNote, additionalInfo, additionalFile, designPayment, amount, email } = req.body;

        // Validate required fields
        if (!userId || !amount || !email) {
            return res.status(400).json({ message: "userId, amount, and email are required" });
        }

        // Check if at least one upload field is provided
        if (!logo && !voiceNote && !additionalInfo && !additionalFile) {
            return res.status(400).json({ message: "At least one upload field (logo, voiceNote, additionalInfo, or additionalFile) is required" });
        }

        // Check if user exists in PostgreSQL
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found. Kindly create an account." });
        }

        // Your original logic (fixed)
        if ((logo || voiceNote || additionalFile || additionalInfo) && !designPayment) {
            const paymentAmount = 0.3 * amount;
            const paymentInitiated = await initializePayment(paymentAmount, email);

            if (!paymentInitiated) {
                return res.status(400).json({ message: "30% upfront commitment is necessary for design to be made." });
            }
        }

        // Save upload details to MongoDB
        const upload = new Upload({
            userId,
            logo: logo || null,
            voiceNote: voiceNote || null,
            additionalInfo: additionalInfo || null,
            additionalFile: additionalFile || null,
            designPayment: designPayment || false, // Default to false if not provided
        });

        await upload.save();

        return res.status(201).json({ message: "Upload details saved successfully", upload });
    } catch (error) {
        console.error("Error saving upload:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const jobDetails = ( ) => {}
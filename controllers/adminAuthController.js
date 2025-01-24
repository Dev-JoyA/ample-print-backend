import Admin from "../models/adminModel.js";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.js";


// Admin Sign-In (for both normal and super admin)
export const adminSignIn = async (req, res) => {
    const { email, password , role} = req.body;
    try {
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Check if admin exists
        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Validate admin password
        const isPasswordValid = await comparePassword(password, admin.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        // Generate a token
        const token = generateToken({ id: admin.id, email: admin.email, role: admin.role });

        return res.status(200).json({
            message: "Signed in successfully",
            token,
            role: admin.role,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error during admin sign-in", error });
    }
};

// Admin Sign-Up (for both super admin and normal admin)
export const adminSignUp = async (req, res) => {
    try {
        const { email, password, phoneNumber, firstName, lastName, userName, role } = req.body;

        // Validate required fields
        if (!email || !password || !phoneNumber || !firstName || !lastName || !userName || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ where: { email } });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with this email already exists" });
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Validate the role
        if (role !== "super" && role !== "normal") {
            return res.status(400).json({ message: "Invalid role specified" });
        }

        // If a normal admin is being created, ensure a super admin is making the request
        if (role === "normal") {
            const requestingAdmin = req.user; 
            if (!requestingAdmin || requestingAdmin.role !== "super") {
                return res.status(403).json({ message: "Only super admins can create normal admins" });
            }
        }

        // Create the admin
        const newAdmin = await Admin.create({
            email,
            password: hashedPassword,
            phoneNumber,
            firstName,
            lastName,
            userName,
            role,
        });

        return res.status(201).json({
            message: `${role === "super" ? "Super admin" : "Normal admin"} created successfully`,
            admin: {
                id: newAdmin.id,
                email: newAdmin.email,
                role: newAdmin.role,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: "Error during admin sign-up", error });
    }
};


export const deleteAdmin = async(req, res) => {
    const { email, password , role} = req.body;
    try{
        if(!email || !password){
            return res.status(400).json({message : "All field required"})
        }
    
        const exisitingAdmin = await Admin.findOne({where : {email}})
        if(!exisitingAdmin){
            return res.status(400).json({message : "Admin not found"})
        }
    
        if(role !== "super"){
            return res.status(403).json({message : "this is a super admin feature"})
        }

        await exisitingAdmin.destroy();
        return res.status(200).json({message : "Admin deleted"})
    }catch(error){
        return res.status(500).json({message : "Error deleting admin", error})
    }
};

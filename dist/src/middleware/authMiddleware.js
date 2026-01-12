import jwt from "jsonwebtoken";
export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
        return res.status(401).json({ message: "No token provided" });
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = { _id: decoded.userId, role: decoded.role };
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token or expired token" });
    }
};
//# sourceMappingURL=authMiddleware.js.map
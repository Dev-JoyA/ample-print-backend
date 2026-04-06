import * as bankAccountService from "../service/bankAccountService.js";
export async function getActive(req, res) {
    try {
        const active = await bankAccountService.getActiveBankAccount();
        return res.status(200).json({ bankAccount: active });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || "Failed to fetch active bank account" });
    }
}
export async function list(req, res) {
    try {
        const bankAccounts = await bankAccountService.listBankAccounts();
        return res.status(200).json({ bankAccounts });
    }
    catch (e) {
        return res.status(500).json({ message: e?.message || "Failed to list bank accounts" });
    }
}
export async function create(req, res) {
    try {
        const { accountName, accountNumber, bankName, isActive } = req.body || {};
        if (!accountName || !accountNumber || !bankName) {
            return res.status(400).json({ message: "accountName, accountNumber and bankName are required" });
        }
        const createdBy = req.user?._id;
        const bankAccount = await bankAccountService.createBankAccount({ accountName, accountNumber, bankName, isActive }, createdBy);
        return res.status(201).json({ bankAccount });
    }
    catch (e) {
        const status = e?.status || 500;
        return res.status(status).json({ message: e?.message || "Failed to create bank account" });
    }
}
export async function setActive(req, res) {
    try {
        const { id } = req.params;
        const bankAccount = await bankAccountService.setActiveBankAccount(id);
        return res.status(200).json({ bankAccount });
    }
    catch (e) {
        const status = e?.status || 500;
        return res.status(status).json({ message: e?.message || "Failed to set active bank account" });
    }
}
export async function remove(req, res) {
    try {
        const { id } = req.params;
        const result = await bankAccountService.deleteBankAccount(id);
        return res.status(200).json({ ...result, message: "Bank account deleted" });
    }
    catch (e) {
        const status = e?.status || 500;
        return res.status(status).json({ message: e?.message || "Failed to delete bank account" });
    }
}
//# sourceMappingURL=bankAccountController.js.map
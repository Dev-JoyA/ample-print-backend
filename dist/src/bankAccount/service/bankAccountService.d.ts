import { IBankAccount } from "../model/bankAccountModel.js";
export declare function getActiveBankAccount(): Promise<IBankAccount | null>;
export declare function listBankAccounts(): Promise<IBankAccount[]>;
export declare function createBankAccount(data: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    isActive?: boolean;
}, createdBy?: string): Promise<IBankAccount>;
export declare function setActiveBankAccount(bankAccountId: string): Promise<IBankAccount>;
export declare function deleteBankAccount(bankAccountId: string): Promise<{
    deletedId: string;
    newActiveId?: string;
}>;
//# sourceMappingURL=bankAccountService.d.ts.map
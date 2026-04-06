type BankAccountForEmails = {
    accountName: string;
    accountNumber: string;
    bankName: string;
};
export declare const sendWelcomeEmail: (to: string, name: string) => Promise<void>;
export declare const sendOrderConfirmation: (to: string, name: string, orderNumber: string, items: any[], total: number, deposit?: boolean) => Promise<void>;
export declare const sendInvoiceReady: (to: string, name: string, orderNumber: string, invoiceNumber: string, total: number, depositAmount?: number, dueDate?: string, items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}>, bankAccount?: BankAccountForEmails) => Promise<void>;
export declare const sendDesignReady: (to: string, name: string, orderNumber: string, productName: string, url: string) => Promise<void>;
export declare const sendDesignApproved: (to: string, name: string, orderNumber: string, productName: string, url: string) => Promise<void>;
export declare const sendPaymentConfirmation: (to: string, name: string, orderNumber: string, amount: number, paymentType: string, paymentMethod: string, remainingBalance: number) => Promise<void>;
export declare const sendReceiptUploaded: (to: string, name: string, orderNumber: string, amount: number, transactionId: string) => Promise<void>;
export declare const sendPaymentVerified: (to: string, name: string, orderNumber: string, amount: number, transactionId: string, status: "approved" | "rejected", notes?: string) => Promise<void>;
export declare const sendFinalPaymentReminder: (to: string, name: string, orderNumber: string, amount: number, bankAccount?: BankAccountForEmails) => Promise<void>;
export declare const sendShippingSelectionReminder: (to: string, name: string, orderNumber: string, link: string) => Promise<void>;
export declare const sendOrderShipped: (to: string, name: string, orderNumber: string, carrier?: string, trackingNumber?: string, estimatedDelivery?: string, shippingAddress?: string, trackingUrl?: string) => Promise<void>;
export declare const sendOrderDelivered: (to: string, name: string, orderNumber: string) => Promise<void>;
export declare const sendOrderCancelled: (to: string, name: string, orderNumber: string) => Promise<void>;
export declare const sendShippingCreated: (to: string, name: string, orderNumber: string, shippingMethod: string, shippingCost: number, address?: string, recipientName?: string, recipientPhone?: string, storeAddress?: string, storeHours?: string) => Promise<void>;
export declare const sendPasswordReset: (to: string, name: string, resetLink: string) => Promise<void>;
export declare const sendAdminNewOrder: (to: string, orderNumber: string, customerName: string, customerEmail: string, total: number, items: any[]) => Promise<void>;
export declare const sendAdminNewBrief: (to: string, orderNumber: string, customerName: string, productName: string, briefDescription: string, hasAttachments: boolean) => Promise<void>;
declare const emailService: {
    sendWelcomeEmail: (to: string, name: string) => Promise<void>;
    sendOrderConfirmation: (to: string, name: string, orderNumber: string, items: any[], total: number, deposit?: boolean) => Promise<void>;
    sendInvoiceReady: (to: string, name: string, orderNumber: string, invoiceNumber: string, total: number, depositAmount?: number, dueDate?: string, items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>, bankAccount?: BankAccountForEmails) => Promise<void>;
    sendDesignReady: (to: string, name: string, orderNumber: string, productName: string, url: string) => Promise<void>;
    sendDesignApproved: (to: string, name: string, orderNumber: string, productName: string, url: string) => Promise<void>;
    sendPaymentConfirmation: (to: string, name: string, orderNumber: string, amount: number, paymentType: string, paymentMethod: string, remainingBalance: number) => Promise<void>;
    sendReceiptUploaded: (to: string, name: string, orderNumber: string, amount: number, transactionId: string) => Promise<void>;
    sendPaymentVerified: (to: string, name: string, orderNumber: string, amount: number, transactionId: string, status: "approved" | "rejected", notes?: string) => Promise<void>;
    sendFinalPaymentReminder: (to: string, name: string, orderNumber: string, amount: number, bankAccount?: BankAccountForEmails) => Promise<void>;
    sendShippingSelectionReminder: (to: string, name: string, orderNumber: string, link: string) => Promise<void>;
    sendOrderShipped: (to: string, name: string, orderNumber: string, carrier?: string, trackingNumber?: string, estimatedDelivery?: string, shippingAddress?: string, trackingUrl?: string) => Promise<void>;
    sendOrderDelivered: (to: string, name: string, orderNumber: string) => Promise<void>;
    sendOrderCancelled: (to: string, name: string, orderNumber: string) => Promise<void>;
    sendShippingCreated: (to: string, name: string, orderNumber: string, shippingMethod: string, shippingCost: number, address?: string, recipientName?: string, recipientPhone?: string, storeAddress?: string, storeHours?: string) => Promise<void>;
    sendPasswordReset: (to: string, name: string, resetLink: string) => Promise<void>;
    sendAdminNewOrder: (to: string, orderNumber: string, customerName: string, customerEmail: string, total: number, items: any[]) => Promise<void>;
    sendAdminNewBrief: (to: string, orderNumber: string, customerName: string, productName: string, briefDescription: string, hasAttachments: boolean) => Promise<void>;
};
export default emailService;
//# sourceMappingURL=email.d.ts.map
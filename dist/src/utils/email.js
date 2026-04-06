import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { BankAccount } from "../bankAccount/model/bankAccountModel.js";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
    pool: true,
    maxConnections: 5,
    rateLimit: 10,
});
// Path to email templates
const TEMPLATE_PATH = path.resolve(projectRoot, "src", "templates", "email");
const getTemplate = async (templateName) => {
    const templatePath = path.join(TEMPLATE_PATH, templateName);
    try {
        const template = await fs.readFile(templatePath, "utf-8");
        return template;
    }
    catch (error) {
        console.error(`Email template ${templateName} not found at ${templatePath}`);
        // Return a simple fallback template
        return `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>Notification from Ample Printhub</h1>
              <p>Hello {{name}},</p>
              <p>This is a notification from Ample Printhub.</p>
            </div>`;
    }
};
const sendEmail = async ({ to, subject, template, data, }) => {
    try {
        // Get the template
        let html = await getTemplate(template);
        // Simple variable replacement
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            const value = data[key] !== undefined ? String(data[key]) : '';
            html = html.replace(regex, value);
        });
        // Replace year
        html = html.replace(/{{year}}/g, new Date().getFullYear().toString());
        await transporter.sendMail({
            from: `"${process.env.COMPANY_NAME || "Ample Printhub"}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`✅ Email sent to ${to}: ${subject}`);
    }
    catch (error) {
        console.error(`❌ Email failed to ${to}: ${subject}`, error.message);
    }
};
// ==================== CUSTOMER EMAILS ====================
export const sendWelcomeEmail = (to, name) => sendEmail({
    to,
    subject: "Welcome to Ample Printhub!",
    template: "welcome.html",
    data: { name },
});
export const sendOrderConfirmation = (to, name, orderNumber, items, total, deposit) => sendEmail({
    to,
    subject: `Order Confirmation: ${orderNumber}`,
    template: "order-confirmation.html",
    data: {
        name,
        orderNumber,
        items: JSON.stringify(items),
        total: total.toString(),
        deposit: deposit ? "Yes" : "No",
        trackUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
export const sendInvoiceReady = (to, name, orderNumber, invoiceNumber, total, depositAmount, dueDate, items, bankAccount) => (async () => {
    const activeBank = bankAccount ||
        (await BankAccount.findOne({ isActive: true })
            .sort({ updatedAt: -1 })
            .exec());
    const money = (n) => `₦${(n || 0).toLocaleString()}`;
    const depositRow = depositAmount && depositAmount > 0
        ? `<tr>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #4a5568; font-weight: 600;">Deposit Required</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748; text-align: right;">${money(depositAmount)}</td>
          </tr>`
        : "";
    const itemsRows = items && items.length
        ? items
            .map((it) => `<tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">${it.description}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748; text-align: center;">${it.quantity}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748; text-align: right;">${money(it.unitPrice)}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748; text-align: right;">${money(it.total)}</td>
              </tr>`)
            .join("")
        : `<tr>
            <td colspan="4" style="padding: 14px 10px; color: #718096; text-align: center;">Invoice items unavailable</td>
          </tr>`;
    await sendEmail({
        to,
        subject: `Invoice Ready: ${invoiceNumber}`,
        template: "invoice-ready.html",
        data: {
            name,
            orderNumber,
            invoiceNumber,
            totalFormatted: money(total),
            total: total.toString(),
            dueDate: dueDate || "Not specified",
            invoiceUrl: `${process.env.FRONTEND_URL}/invoices/${invoiceNumber}`,
            itemsRows,
            depositRow,
            bankAccountName: activeBank?.accountName || "Not available",
            bankAccountNumber: activeBank?.accountNumber || "Not available",
            bankName: activeBank?.bankName || "Not available",
        },
    });
})();
export const sendDesignReady = (to, name, orderNumber, productName, url) => sendEmail({
    to,
    subject: `Design Ready for Review: ${orderNumber}`,
    template: "design-ready.html",
    data: {
        name,
        orderNumber,
        productName,
        designUrl: url,
    },
});
export const sendDesignApproved = (to, name, orderNumber, productName, url) => sendEmail({
    to,
    subject: `Design Approved: ${orderNumber}`,
    template: "design-approved.html",
    data: {
        name,
        orderNumber,
        productName,
        trackUrl: url,
    },
});
export const sendPaymentConfirmation = (to, name, orderNumber, amount, paymentType, paymentMethod, remainingBalance) => sendEmail({
    to,
    subject: `Payment Received for Order ${orderNumber}`,
    template: "payment-confirmation.html",
    data: {
        name,
        orderNumber,
        amount: amount.toString(),
        paymentType,
        paymentMethod,
        remainingBalance: remainingBalance.toString(),
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
export const sendReceiptUploaded = (to, name, orderNumber, amount, transactionId) => sendEmail({
    to,
    subject: "Receipt Received - Pending Verification",
    template: "receipt-uploaded.html",
    data: {
        name,
        orderNumber,
        amount: amount.toString(),
        transactionId,
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
export const sendPaymentVerified = (to, name, orderNumber, amount, transactionId, status, notes) => sendEmail({
    to,
    subject: status === "approved"
        ? "Payment Verified Successfully"
        : "Payment Verification Failed",
    template: "payment-verified.html",
    data: {
        name,
        orderNumber,
        amount: amount.toString(),
        transactionId,
        status,
        notes: notes || "",
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
// ==================== SHIPPING RELATED EMAILS ====================
export const sendFinalPaymentReminder = (to, name, orderNumber, amount, bankAccount) => (async () => {
    const activeBank = bankAccount ||
        (await BankAccount.findOne({ isActive: true })
            .sort({ updatedAt: -1 })
            .exec());
    await sendEmail({
        to,
        subject: `Final Payment Required for Order #${orderNumber}`,
        template: "final-payment-reminder.html",
        data: {
            name,
            orderNumber,
            amount: amount.toString(),
            paymentUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}/payment`,
            bankAccountName: activeBank?.accountName || "Not available",
            bankAccountNumber: activeBank?.accountNumber || "Not available",
            bankName: activeBank?.bankName || "Not available",
        },
    });
})();
export const sendShippingSelectionReminder = (to, name, orderNumber, link) => sendEmail({
    to,
    subject: `Order #${orderNumber} Ready for Shipping Selection`,
    template: "shipping-selection-reminder.html",
    data: {
        name,
        orderNumber,
        shippingUrl: link,
    },
});
export const sendOrderShipped = (to, name, orderNumber, carrier, trackingNumber, estimatedDelivery, shippingAddress, trackingUrl) => sendEmail({
    to,
    subject: `Order #${orderNumber} Has Been Shipped!`,
    template: "order-shipped.html",
    data: {
        name,
        orderNumber,
        carrier: carrier || "Not specified",
        trackingNumber: trackingNumber || "Not available",
        estimatedDelivery: estimatedDelivery || "To be confirmed",
        shippingAddress: shippingAddress || "Address not specified",
        trackUrl: trackingUrl || `${process.env.FRONTEND_URL}/orders/${orderNumber}/tracking`,
    },
});
export const sendOrderDelivered = (to, name, orderNumber) => sendEmail({
    to,
    subject: `Order Delivered: ${orderNumber}`,
    template: "order-delivered.html",
    data: {
        name,
        orderNumber,
        reviewUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}/review`,
    },
});
export const sendOrderCancelled = (to, name, orderNumber) => sendEmail({
    to,
    subject: `Order #${orderNumber} Has Been Cancelled`,
    template: "order-cancelled.html",
    data: {
        name,
        orderNumber,
        supportUrl: `${process.env.FRONTEND_URL}/support`,
    },
});
export const sendShippingCreated = (to, name, orderNumber, shippingMethod, shippingCost, address, recipientName, recipientPhone, storeAddress, storeHours) => sendEmail({
    to,
    subject: shippingMethod === "delivery"
        ? "Shipping Arranged"
        : "Order Ready for Pickup",
    template: "shipping-created.html",
    data: {
        name,
        orderNumber,
        shippingMethod,
        shippingCost: shippingCost.toString(),
        address: address || "",
        recipientName: recipientName || "",
        recipientPhone: recipientPhone || "",
        storeAddress: storeAddress || "5 Boyle Street Shomolu, Lagos",
        storeHours: storeHours || "Mon-Fri 9am-5pm",
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
// ==================== ACCOUNT EMAILS ====================
export const sendPasswordReset = (to, name, resetLink) => sendEmail({
    to,
    subject: "Password Reset Request",
    template: "password-reset.html",
    data: {
        name,
        resetLink,
    },
});
// ==================== ADMIN NOTIFICATIONS ====================
export const sendAdminNewOrder = (to, orderNumber, customerName, customerEmail, total, items) => sendEmail({
    to,
    subject: `New Order: ${orderNumber}`,
    template: "admin-new-order.html",
    data: {
        orderNumber,
        customerName,
        customerEmail,
        total: total.toString(),
        items: JSON.stringify(items),
        adminUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/orders/${orderNumber}`,
    },
});
export const sendAdminNewBrief = (to, orderNumber, customerName, productName, briefDescription, hasAttachments) => sendEmail({
    to,
    subject: `New Brief: ${orderNumber}`,
    template: "admin-new-brief.html",
    data: {
        orderNumber,
        customerName,
        productName,
        briefDescription,
        hasAttachments: hasAttachments ? "Yes" : "No",
        adminUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/orders/${orderNumber}/brief`,
    },
});
// ==================== EXPORT DEFAULT OBJECT ====================
const emailService = {
    sendWelcomeEmail,
    sendOrderConfirmation,
    sendInvoiceReady,
    sendDesignReady,
    sendDesignApproved,
    sendPaymentConfirmation,
    sendReceiptUploaded,
    sendPaymentVerified,
    sendFinalPaymentReminder,
    sendShippingSelectionReminder,
    sendOrderShipped,
    sendOrderDelivered,
    sendOrderCancelled,
    sendShippingCreated,
    sendPasswordReset,
    sendAdminNewOrder,
    sendAdminNewBrief,
};
export default emailService;
//# sourceMappingURL=email.js.map
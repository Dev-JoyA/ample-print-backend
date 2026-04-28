import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import { BankAccount } from "../bankAccount/model/bankAccountModel.js";
dotenv.config();
Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
});
Handlebars.registerHelper("ne", function (a, b) {
    return a !== b;
});
Handlebars.registerHelper("gt", function (a, b) {
    return a > b;
});
Handlebars.registerHelper("lt", function (a, b) {
    return a < b;
});
Handlebars.registerHelper("or", function (a, b) {
    return a || b;
});
Handlebars.registerHelper("and", function (a, b) {
    return a && b;
});
Handlebars.registerHelper("isDefined", function (value) {
    return value !== undefined && value !== null;
});
Handlebars.registerHelper("formatNumber", function (value) {
    return value?.toLocaleString() || "0";
});
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
const TEMPLATE_PATH = path.resolve(projectRoot, "src", "templates", "email");
const templateCache = new Map();
const getCompiledTemplate = async (templateName) => {
    if (templateCache.has(templateName)) {
        return templateCache.get(templateName);
    }
    const templatePath = path.join(TEMPLATE_PATH, templateName);
    let source;
    try {
        source = await fs.readFile(templatePath, "utf-8");
    }
    catch {
        console.error(`Email template ${templateName} not found at ${templatePath}`);
        source = `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>Notification from Ample Printhub</h1>
                <p>Hello {{name}},</p>
                <p>This is a notification from Ample Printhub.</p>
              </div>`;
    }
    const compiled = Handlebars.compile(source);
    templateCache.set(templateName, compiled);
    return compiled;
};
const sendEmail = async ({ to, subject, template, data, }) => {
    try {
        const compiledTemplate = await getCompiledTemplate(template);
        const html = compiledTemplate({
            ...data,
            year: new Date().getFullYear(),
        });
        await transporter.sendMail({
            from: `"${process.env.COMPANY_NAME || "Ample Printhub"}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments: [
                {
                    filename: "ample_logo.png",
                    path: path.resolve(projectRoot, "public", "images", "ample_logo.png"),
                    cid: "ample_logo",
                },
            ],
        });
        console.log(`✅ Email sent to ${to}: ${subject}`);
    }
    catch (error) {
        console.error(`❌ Email failed to ${to}: ${subject}`, error.message);
    }
};
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
        items,
        total,
        deposit: !!deposit,
        trackUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
export const sendInvoiceReady = (to, name, orderNumber, invoiceNumber, total, depositAmount, dueDate, items) => (async () => {
    // const activeBank =
    //   bankAccount ||
    //   (await BankAccount.findOne({ isActive: true })
    //     .sort({ updatedAt: -1 })
    //     .exec());
    await sendEmail({
        to,
        subject: `Invoice Ready: ${invoiceNumber}`,
        template: "invoice-ready.html",
        data: {
            name,
            orderNumber,
            invoiceNumber,
            total,
            totalFormatted: `₦${(total || 0).toLocaleString()}`,
            dueDate: dueDate || "Not specified",
            invoiceUrl: `${process.env.FRONTEND_URL}/invoices/${invoiceNumber}`,
            items: items || [],
            hasDeposit: depositAmount && depositAmount > 0,
            depositAmount,
            depositAmountFormatted: `₦${(depositAmount || 0).toLocaleString()}`,
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
        amount,
        paymentType,
        paymentMethod,
        remainingBalance,
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
export const sendReceiptUploaded = (to, name, orderNumber, amount, transactionId, receiptUrl) => sendEmail({
    to,
    subject: `Receipt Received - Pending Verification`,
    template: "receipt-uploaded.html",
    data: {
        name,
        orderNumber,
        amount: amount.toLocaleString(),
        transactionId,
        receiptUrl,
        receiptFileName: receiptUrl.split("/").pop() || "receipt",
        uploadDate: new Date().toLocaleString(),
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
        supportUrl: `${process.env.FRONTEND_URL}/support`,
        privacyUrl: `${process.env.FRONTEND_URL}/privacy`,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`,
        year: new Date().getFullYear(),
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
        amount: amount.toLocaleString(),
        transactionId,
        status,
        notes: notes || "",
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
        uploadUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}/upload-receipt`,
        supportUrl: `${process.env.FRONTEND_URL}/support`,
        privacyUrl: `${process.env.FRONTEND_URL}/privacy`,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`,
        year: new Date().getFullYear(),
    },
});
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
            amount,
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
        supportUrl: `${process.env.FRONTEND_URL}/support`,
        privacyUrl: `${process.env.FRONTEND_URL}/privacy`,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`,
        year: new Date().getFullYear(),
    },
});
// export const sendShippingSelectionReminder = (
//   to: string,
//   name: string,
//   orderNumber: string,
//   link: string
// ): Promise<void> =>
//   sendEmail({
//     to,
//     subject: `Order #${orderNumber} Ready for Shipping Selection`,
//     template: "shipping-selection-reminder.html",
//     data: {
//       name,
//       orderNumber,
//       shippingUrl: link,
//     },
//   });
export const sendOrderShipped = (to, name, orderNumber, carrier, trackingNumber, estimatedDelivery, shippingAddress, trackingUrl, driverName, driverPhone) => {
    const hasTrackingInfo = !!(carrier && trackingNumber);
    const hasDriverInfo = !!(driverName || driverPhone);
    return sendEmail({
        to,
        subject: `Order #${orderNumber} Has Been Shipped!`,
        template: "order-shipped.html",
        data: {
            name,
            orderNumber,
            carrier: carrier || "",
            trackingNumber: trackingNumber || "",
            estimatedDelivery: estimatedDelivery || "",
            shippingAddress: shippingAddress || "",
            trackUrl: trackingUrl ||
                `${process.env.FRONTEND_URL}/orders/${orderNumber}/tracking`,
            driverName: driverName || "",
            driverPhone: driverPhone || "",
            hasTrackingInfo,
            hasDriverInfo,
            year: new Date().getFullYear(),
            unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`,
            privacyUrl: `${process.env.FRONTEND_URL}/privacy`,
            supportUrl: `${process.env.FRONTEND_URL}/support`,
        },
    });
};
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
        shippingCost,
        isDelivery: shippingMethod === "delivery",
        isPickup: shippingMethod !== "delivery",
        address: address || "",
        recipientName: recipientName || "",
        recipientPhone: recipientPhone || "",
        storeAddress: storeAddress || "5 Boyle Street Shomolu, Lagos",
        storeHours: storeHours || "Mon-Fri 9am-5pm",
        orderUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}`,
    },
});
export const sendPasswordReset = (to, name, resetLink) => sendEmail({
    to,
    subject: "Password Reset Request",
    template: "password-reset.html",
    data: {
        name,
        resetLink,
    },
});
export const sendAdminNewOrder = (to, orderNumber, customerName, customerEmail, total, items) => sendEmail({
    to,
    subject: `New Order: ${orderNumber}`,
    template: "admin-new-order.html",
    data: {
        orderNumber,
        customerName,
        customerEmail,
        total,
        items,
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
        hasAttachments,
        adminUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/orders/${orderNumber}/brief`,
    },
});
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
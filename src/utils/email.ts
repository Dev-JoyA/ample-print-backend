import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

// Type definitions
interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

interface EmailData {
  name: string;
  orderNumber?: string;
  items?: string;
  total?: number;
  deposit?: string;
  trackUrl?: string;
  invoiceNumber?: string;
  depositAmount?: number;
  dueDate?: string;
  invoiceUrl?: string;
  productName?: string;
  designUrl?: string;
  productionTime?: string;
  estimatedDelivery?: string;
  amount?: number;
  paymentType?: string;
  paymentMethod?: string;
  remainingBalance?: number;
  orderUrl?: string;
  transactionId?: string;
  status?: string;
  notes?: string;
  paymentUrl?: string;
  shippingUrl?: string;
  carrier?: string;
  trackingNumber?: string;
  shippingAddress?: string;
  reviewUrl?: string;
  supportUrl?: string;
  shippingMethod?: string;
  shippingCost?: number;
  address?: string;
  recipientName?: string;
  recipientPhone?: string;
  storeAddress?: string;
  storeHours?: string;
  resetLink?: string;
  customerName?: string;
  customerEmail?: string;
  briefDescription?: string;
  hasAttachments?: string;
  adminUrl?: string;
}

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

const getTemplate = async (templateName: string): Promise<string> => {
  const templatePath = path.join(TEMPLATE_PATH, templateName);

  try {
    const template = await fs.readFile(templatePath, "utf-8");
    return template;
  } catch (error) {
    console.error(`Email template ${templateName} not found at ${templatePath}`);
    // Return a simple fallback template
    return `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>Notification from Ample Printhub</h1>
              <p>Hello {{name}},</p>
              <p>This is a notification from Ample Printhub.</p>
            </div>`;
  }
};

const sendEmail = async ({
  to,
  subject,
  template,
  data,
}: EmailOptions): Promise<void> => {
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
  } catch (error: any) {
    console.error(`❌ Email failed to ${to}: ${subject}`, error.message);
  }
};

// ==================== CUSTOMER EMAILS ====================

export const sendWelcomeEmail = (to: string, name: string): Promise<void> =>
  sendEmail({
    to,
    subject: "Welcome to Ample Printhub!",
    template: "welcome.html",
    data: { name },
  });

export const sendOrderConfirmation = (
  to: string,
  name: string,
  orderNumber: string,
  items: any[],
  total: number,
  deposit?: boolean,
): Promise<void> =>
  sendEmail({
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

export const sendInvoiceReady = (
  to: string,
  name: string,
  orderNumber: string,
  invoiceNumber: string,
  total: number,
  depositAmount?: number,
  dueDate?: string,
): Promise<void> =>
  sendEmail({
    to,
    subject: `Invoice Ready: ${invoiceNumber}`,
    template: "invoice-ready.html",
    data: {
      name,
      orderNumber,
      invoiceNumber,
      total: total.toString(),
      depositAmount: depositAmount || 0,
      dueDate: dueDate || "Not specified",
      invoiceUrl: `${process.env.FRONTEND_URL}/invoices/${invoiceNumber}`,
    },
  });

export const sendDesignReady = (
  to: string,
  name: string,
  orderNumber: string,
  productName: string,
  url: string,
): Promise<void> =>
  sendEmail({
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

export const sendDesignApproved = (
  to: string,
  name: string,
  orderNumber: string,
  productName: string,
  url: string
): Promise<void> =>
  sendEmail({
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

export const sendPaymentConfirmation = (
  to: string,
  name: string,
  orderNumber: string,
  amount: number,
  paymentType: string,
  paymentMethod: string,
  remainingBalance: number,
): Promise<void> =>
  sendEmail({
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

export const sendReceiptUploaded = (
  to: string,
  name: string,
  orderNumber: string,
  amount: number,
  transactionId: string,
): Promise<void> =>
  sendEmail({
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

export const sendPaymentVerified = (
  to: string,
  name: string,
  orderNumber: string,
  amount: number,
  transactionId: string,
  status: "approved" | "rejected",
  notes?: string,
): Promise<void> =>
  sendEmail({
    to,
    subject:
      status === "approved"
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

export const sendFinalPaymentReminder = (
  to: string,
  name: string,
  orderNumber: string,
  amount: number,
): Promise<void> =>
  sendEmail({
    to,
    subject: `Final Payment Required for Order #${orderNumber}`,
    template: "final-payment-reminder.html",
    data: {
      name,
      orderNumber,
      amount: amount.toString(),
      paymentUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}/payment`,
    },
  });

export const sendShippingSelectionReminder = (
  to: string,
  name: string,
  orderNumber: string,
  link: string,
): Promise<void> =>
  sendEmail({
    to,
    subject: `Order #${orderNumber} Ready for Shipping Selection`,
    template: "shipping-selection-reminder.html",
    data: {
      name,
      orderNumber,
      shippingUrl: link,
    },
  });

export const sendOrderShipped = (
  to: string,
  name: string,
  orderNumber: string,
  carrier?: string,
  trackingNumber?: string,
  estimatedDelivery?: string,
  shippingAddress?: string,
  trackingUrl?: string,
): Promise<void> =>
  sendEmail({
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

export const sendOrderDelivered = (
  to: string,
  name: string,
  orderNumber: string,
): Promise<void> =>
  sendEmail({
    to,
    subject: `Order Delivered: ${orderNumber}`,
    template: "order-delivered.html",
    data: {
      name,
      orderNumber,
      reviewUrl: `${process.env.FRONTEND_URL}/orders/${orderNumber}/review`,
    },
  });

export const sendOrderCancelled = (
  to: string,
  name: string,
  orderNumber: string,
): Promise<void> =>
  sendEmail({
    to,
    subject: `Order #${orderNumber} Has Been Cancelled`,
    template: "order-cancelled.html",
    data: {
      name,
      orderNumber,
      supportUrl: `${process.env.FRONTEND_URL}/support`,
    },
  });

export const sendShippingCreated = (
  to: string,
  name: string,
  orderNumber: string,
  shippingMethod: string,
  shippingCost: number,
  address?: string,
  recipientName?: string,
  recipientPhone?: string,
  storeAddress?: string,
  storeHours?: string,
): Promise<void> =>
  sendEmail({
    to,
    subject:
      shippingMethod === "delivery"
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

export const sendPasswordReset = (
  to: string,
  name: string,
  resetLink: string,
): Promise<void> =>
  sendEmail({
    to,
    subject: "Password Reset Request",
    template: "password-reset.html",
    data: {
      name,
      resetLink,
    },
  });

// ==================== ADMIN NOTIFICATIONS ====================

export const sendAdminNewOrder = (
  to: string,
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  total: number,
  items: any[],
): Promise<void> =>
  sendEmail({
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

export const sendAdminNewBrief = (
  to: string,
  orderNumber: string,
  customerName: string,
  productName: string,
  briefDescription: string,
  hasAttachments: boolean,
): Promise<void> =>
  sendEmail({
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
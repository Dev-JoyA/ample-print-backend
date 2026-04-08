import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import { BankAccount } from "../bankAccount/model/bankAccountModel.js";

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

type BankAccountForEmails = {
  accountName: string;
  accountNumber: string;
  bankName: string;
};

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

// Cache compiled templates to avoid re-reading/re-compiling on every send
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

const getCompiledTemplate = async (
  templateName: string
): Promise<HandlebarsTemplateDelegate> => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const templatePath = path.join(TEMPLATE_PATH, templateName);

  let source: string;
  try {
    source = await fs.readFile(templatePath, "utf-8");
  } catch (error) {
    console.error(
      `Email template ${templateName} not found at ${templatePath}`
    );
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

const sendEmail = async ({
  to,
  subject,
  template,
  data,
}: EmailOptions): Promise<void> => {
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
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>,
  total: number,
  deposit?: boolean
): Promise<void> =>
  sendEmail({
    to,
    subject: `Order Confirmation: ${orderNumber}`,
    template: "order-confirmation.html",
    data: {
      name,
      orderNumber,
      items, // pass as array — Handlebars {{#each items}} handles it
      total,
      deposit: !!deposit,
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
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>,
  bankAccount?: BankAccountForEmails
): Promise<void> =>
  (async () => {
    const activeBank =
      bankAccount ||
      (await BankAccount.findOne({ isActive: true })
        .sort({ updatedAt: -1 })
        .exec());

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
        items: items || [], // {{#each items}} in template
        hasDeposit: depositAmount && depositAmount > 0,
        depositAmount,
        depositAmountFormatted: `₦${(depositAmount || 0).toLocaleString()}`,
        bankAccountName: activeBank?.accountName || "Not available",
        bankAccountNumber: activeBank?.accountNumber || "Not available",
        bankName: activeBank?.bankName || "Not available",
      },
    });
  })();

export const sendDesignReady = (
  to: string,
  name: string,
  orderNumber: string,
  productName: string,
  url: string
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
  remainingBalance: number
): Promise<void> =>
  sendEmail({
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

export const sendReceiptUploaded = (
  to: string,
  name: string,
  orderNumber: string,
  amount: number,
  transactionId: string
): Promise<void> =>
  sendEmail({
    to,
    subject: "Receipt Received - Pending Verification",
    template: "receipt-uploaded.html",
    data: {
      name,
      orderNumber,
      amount,
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
  notes?: string
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
      amount,
      transactionId,
      status,
      isApproved: status === "approved",
      isRejected: status === "rejected",
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
  bankAccount?: BankAccountForEmails
): Promise<void> =>
  (async () => {
    const activeBank =
      bankAccount ||
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

export const sendShippingSelectionReminder = (
  to: string,
  name: string,
  orderNumber: string,
  link: string
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
  trackingUrl?: string
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
      trackUrl:
        trackingUrl ||
        `${process.env.FRONTEND_URL}/orders/${orderNumber}/tracking`,
    },
  });

export const sendOrderDelivered = (
  to: string,
  name: string,
  orderNumber: string
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
  orderNumber: string
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
  storeHours?: string
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

// ==================== ACCOUNT EMAILS ====================

export const sendPasswordReset = (
  to: string,
  name: string,
  resetLink: string
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
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>
): Promise<void> =>
  sendEmail({
    to,
    subject: `New Order: ${orderNumber}`,
    template: "admin-new-order.html",
    data: {
      orderNumber,
      customerName,
      customerEmail,
      total,
      items, // pass as array — Handlebars {{#each items}} handles it
      adminUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/orders/${orderNumber}`,
    },
  });

export const sendAdminNewBrief = (
  to: string,
  orderNumber: string,
  customerName: string,
  productName: string,
  briefDescription: string,
  hasAttachments: boolean
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
      hasAttachments, // pass as boolean — {{#if hasAttachments}} works directly
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
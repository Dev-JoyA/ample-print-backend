import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ejs from "ejs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

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

// Template cache
const templateCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Path to email templates
const TEMPLATE_PATH = path.resolve(projectRoot, "templates", "email");

const getTemplate = async (templateName: string): Promise<string> => {
  const cached = templateCache.get(templateName);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.content;
  }

  const templatePath = path.join(TEMPLATE_PATH, templateName);

  try {
    const template = await fs.readFile(templatePath, "utf-8");
    templateCache.set(templateName, {
      content: template,
      timestamp: Date.now(),
    });
    return template;
  } catch (error) {
    console.error(
      `Email template ${templateName} not found at ${templatePath}`,
    );
    // Return a simple fallback template
    return `<div><h1>Notification</h1><p>Hello <%= name %></p></div>`;
  }
};

const getLogoAttachment = async () => {
  const logoPath = path.resolve(
    projectRoot,
    "public",
    "images",
    "ample_logo.png",
  );
  try {
    await fs.access(logoPath);
    return [
      {
        filename: "ample_logo.png",
        path: logoPath,
        cid: "ample_logo",
      },
    ];
  } catch {
    console.warn("Logo file not found - sending without logo");
    return [];
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

const sendEmail = async ({
  to,
  subject,
  template,
  data,
}: EmailOptions): Promise<void> => {
  try {
    // Get the main template
    const mainTemplate = await getTemplate("emailTemplate.ejs");

    // Get the content template
    const contentTemplate = await getTemplate(template);

    // Prepare the data with defaults
    const templateData = {
      ...data,
      frontendUrl: process.env.FRONTEND_URL || "https://www.ampleprinthub.com",
      year: new Date().getFullYear(),
      email: to,
      header: data.header || getHeaderFromTemplate(template),
      buttonText: data.buttonText,
      buttonUrl: data.buttonUrl,
      unsubscribeUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/unsubscribe?email=${to}`,
      privacyUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/privacy`,
    };

    // Render the content template first to get the body HTML
    const bodyContent = await ejs.render(contentTemplate, templateData, {
      async: true,
    });

    // Then render the main template with the body content
    const html = await ejs.render(
      mainTemplate,
      {
        ...templateData,
        bodyContent,
      },
      { async: true },
    );

    const attachments = await getLogoAttachment();

    await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || "Ample Printhub"}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    });

    console.log(`✅ Email sent to ${to}: ${subject}`);
  } catch (error: any) {
    console.error(`❌ Email failed to ${to}: ${subject}`, error.message);
  }
};

// Helper function to get header from template name
const getHeaderFromTemplate = (template: string): string => {
  const headers: Record<string, string> = {
    "welcome.ejs": "Welcome to Ample Printhub!",
    "order-confirmation.ejs": "Order Confirmed!",
    "invoice-ready.ejs": "Your Invoice is Ready",
    "design-ready.ejs": "Your Design is Ready!",
    "design-approved.ejs": "Design Approved!",
    "order-shipped.ejs": "Your Order is on the Way!",
    "order-delivered.ejs": "Order Delivered!",
    "password-reset.ejs": "Reset Your Password",
    "admin-new-order.ejs": "New Order Received",
    "admin-new-brief.ejs": "New Customization Brief",
    "payment-confirmation.ejs": "Payment Received!",
    "receipt-uploaded.ejs": "Receipt Received",
    "payment-verified.ejs": "Payment Verification",
    "shipping-created.ejs": "Shipping Update",
  };
  return headers[template] || "Notification from Ample Printhub";
};

// Export individual functions
export const sendWelcomeEmail = (to: string, name: string) =>
  sendEmail({
    to,
    subject: "Welcome to Ample Printhub!",
    template: "welcome.ejs",
    data: { name, header: "Welcome to Ample Printhub!" },
  });

export const sendOrderConfirmation = (
  to: string,
  name: string,
  orderNumber: string,
  items: any[],
  total: number,
  deposit?: boolean,
) =>
  sendEmail({
    to,
    subject: `Order Confirmation: ${orderNumber}`,
    template: "order-confirmation.ejs",
    data: {
      name,
      orderNumber,
      items,
      total,
      deposit,
      header: "Order Confirmed!",
      buttonText: "Track Order",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}`,
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
) =>
  sendEmail({
    to,
    subject: `Invoice Ready: ${invoiceNumber}`,
    template: "invoice-ready.ejs",
    data: {
      name,
      orderNumber,
      invoiceNumber,
      total,
      depositAmount,
      dueDate,
      header: "Your Invoice is Ready",
      buttonText: "View Invoice",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/invoices/${invoiceNumber}`,
    },
  });

export const sendDesignReady = (
  to: string,
  name: string,
  orderNumber: string,
  productName: string,
  designPreviewUrl: string,
) =>
  sendEmail({
    to,
    subject: `Design Ready for Review: ${orderNumber}`,
    template: "design-ready.ejs",
    data: {
      name,
      orderNumber,
      productName,
      designPreviewUrl,
      header: "Your Design is Ready!",
      buttonText: "Review Design",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}/design`,
    },
  });

export const sendDesignApproved = (
  to: string,
  name: string,
  orderNumber: string,
  productName: string,
  productionTime: string,
  estimatedDelivery: string,
) =>
  sendEmail({
    to,
    subject: `Design Approved: ${orderNumber}`,
    template: "design-approved.ejs",
    data: {
      name,
      orderNumber,
      productName,
      productionTime,
      estimatedDelivery,
      header: "Design Approved!",
      buttonText: "Track Production",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}`,
    },
  });

export const sendOrderShipped = (
  to: string,
  name: string,
  orderNumber: string,
  carrier: string,
  trackingNumber: string,
  estimatedDelivery: string,
  shippingAddress: string,
  trackingUrl: string,
) =>
  sendEmail({
    to,
    subject: `Order Shipped: ${orderNumber}`,
    template: "order-shipped.ejs",
    data: {
      name,
      orderNumber,
      carrier,
      trackingNumber,
      estimatedDelivery,
      shippingAddress,
      trackingUrl,
      header: "Your Order is on the Way!",
      buttonText: "Track Package",
      buttonUrl: trackingUrl,
    },
  });

export const sendOrderDelivered = (
  to: string,
  name: string,
  orderNumber: string,
) =>
  sendEmail({
    to,
    subject: `Order Delivered: ${orderNumber}`,
    template: "order-delivered.ejs",
    data: {
      name,
      orderNumber,
      header: "Order Delivered!",
      buttonText: "Leave a Review",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}/review`,
    },
  });

export const sendPasswordReset = (
  to: string,
  name: string,
  resetLink: string,
) =>
  sendEmail({
    to,
    subject: "Password Reset Request",
    template: "password-reset.ejs",
    data: {
      name,
      resetLink,
      header: "Reset Your Password",
      buttonText: "Reset Password",
      buttonUrl: resetLink,
    },
  });

// Admin notifications
export const sendAdminNewOrder = (
  to: string,
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  total: number,
  items: any[],
) =>
  sendEmail({
    to,
    subject: `New Order: ${orderNumber}`,
    template: "admin-new-order.ejs",
    data: {
      orderNumber,
      customerName,
      customerEmail,
      total,
      items,
      name: "Admin",
      header: "New Order Received",
      buttonText: "View Order",
      buttonUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/orders/${orderNumber}`,
    },
  });

export const sendAdminNewBrief = (
  to: string,
  orderNumber: string,
  customerName: string,
  productName: string,
  briefDescription: string,
  hasAttachments: boolean,
) =>
  sendEmail({
    to,
    subject: `New Brief: ${orderNumber}`,
    template: "admin-new-brief.ejs",
    data: {
      orderNumber,
      customerName,
      productName,
      briefDescription,
      hasAttachments,
      name: "Admin",
      header: "New Customization Brief",
      buttonText: "View Brief",
      buttonUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/orders/${orderNumber}/brief`,
    },
  });

// Add these new export functions BEFORE the default export object
export const sendPaymentConfirmation = (
  to: string,
  name: string,
  orderNumber: string,
  amount: number,
  paymentType: string,
  paymentMethod: string,
  remainingBalance: number,
) =>
  sendEmail({
    to,
    subject: `Payment Received for Order ${orderNumber}`,
    template: "payment-confirmation.ejs",
    data: {
      name,
      orderNumber,
      amount,
      paymentType,
      paymentMethod,
      remainingBalance,
      header: "Payment Received!",
      buttonText: "View Order",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}`,
    },
  });

export const sendReceiptUploaded = (
  to: string,
  name: string,
  orderNumber: string,
  amount: number,
  transactionId: string,
) =>
  sendEmail({
    to,
    subject: `Receipt Received - Pending Verification`,
    template: "receipt-uploaded.ejs",
    data: {
      name,
      orderNumber,
      amount,
      transactionId,
      header: "Receipt Received",
      buttonText: "View Order",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}`,
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
) =>
  sendEmail({
    to,
    subject:
      status === "approved"
        ? "Payment Verified Successfully"
        : "Payment Verification Failed",
    template: "payment-verified.ejs",
    data: {
      name,
      orderNumber,
      amount,
      transactionId,
      status,
      notes,
      header:
        status === "approved"
          ? "Payment Verified! ✅"
          : "Payment Verification Failed ❌",
      buttonText: "View Order",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}`,
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
) =>
  sendEmail({
    to,
    subject:
      shippingMethod === "delivery"
        ? "Shipping Arranged"
        : "Order Ready for Pickup",
    template: "shipping-created.ejs",
    data: {
      name,
      orderNumber,
      shippingMethod,
      shippingCost,
      address,
      recipientName,
      recipientPhone,
      storeAddress:
        storeAddress ||
        process.env.STORE_ADDRESS ||
        "5 Boyle Street Shomolu, Lagos",
      storeHours: storeHours || process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
      header:
        shippingMethod === "delivery"
          ? "Your Order is on the Way! 🚚"
          : "Ready for Pickup! 🏢",
      buttonText: "View Order",
      buttonUrl: `${process.env.FRONTEND_URL || "https://www.ampleprinthub.com"}/orders/${orderNumber}`,
    },
  });

// Export default object
const emailService = {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendInvoiceReady,
  sendDesignReady,
  sendDesignApproved,
  sendOrderShipped,
  sendOrderDelivered,
  sendPasswordReset,
  sendAdminNewOrder,
  sendAdminNewBrief,
  sendPaymentConfirmation,
  sendReceiptUploaded,
  sendPaymentVerified,
  sendShippingCreated,
};

export default emailService;

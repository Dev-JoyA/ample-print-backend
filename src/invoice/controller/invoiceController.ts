import { Request, Response } from "express";
import * as invoiceService from "../service/invoiceService.js";
import { InvoiceStatus, InvoiceType, Invoice } from "../model/invoiceModel.js";
import PDFDocument from "pdfkit";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };
    const { orderId } = req.params as { orderId: string };
    const {
      paymentType,
      depositAmount,
      discount,
      dueDate,
      notes,
      paymentInstructions,
      items,
    } = req.body;

    if (!paymentType || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "paymentType and dueDate are required",
      });
    }

    if (!["full", "part"].includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: "paymentType must be 'full' or 'part'",
      });
    }

    const invoice = await invoiceService.createInvoice(
      orderId,
      {
        paymentType,
        depositAmount,
        discount,
        dueDate: new Date(dueDate),
        notes,
        paymentInstructions,
        items,
      },
      user._id,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const createShippingInvoice = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };
    const { orderId, shippingId } = req.params as {
      orderId: string;
      shippingId: string;
    };
    const { shippingCost, dueDate, notes } = req.body;

    if (!shippingCost || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "shippingCost and dueDate are required",
      });
    }

    const invoice = await invoiceService.createShippingInvoice(
      orderId,
      shippingId,
      {
        shippingCost,
        dueDate: new Date(dueDate),
        notes,
      },
      user._id,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Shipping invoice created successfully",
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };
    const { invoiceId } = req.params as { invoiceId: string };
    const updateData = req.body;

    const invoice = await invoiceService.updateInvoice(
      invoiceId,
      updateData,
      user._id,
      user.role,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };
    const { invoiceId } = req.params as { invoiceId: string };

    const result = await invoiceService.deleteInvoice(invoiceId, user.role, io);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendInvoiceToCustomer = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };
    const { invoiceId } = req.params as { invoiceId: string };

    const invoice = await invoiceService.sendInvoiceToCustomer(
      invoiceId,
      user._id,
      user.role,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Invoice sent to customer successfully",
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await invoiceService.getAllInvoices(page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { invoiceId } = req.params as { invoiceId: string };

    const invoice = await invoiceService.getInvoiceById(
      invoiceId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInvoiceByNumber = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { invoiceNumber } = req.params as { invoiceNumber: string };

    const invoice = await invoiceService.getInvoiceByNumber(
      invoiceNumber,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInvoiceByOrderId = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { orderId } = req.params as { orderId: string };

    const invoice = await invoiceService.getInvoiceByOrderId(
      orderId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInvoiceByOrderNumber = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { orderNumber } = req.params as { orderNumber: string };

    const invoice = await invoiceService.getInvoiceByOrderNumber(
      orderNumber,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserInvoices = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await invoiceService.getUserInvoices(user._id, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const filterInvoices = async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as InvoiceStatus,
      invoiceType: req.query.invoiceType as InvoiceType,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
      userId: req.query.userId as string,
      orderId: req.query.orderId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
    };

    const result = await invoiceService.filterInvoices(filters);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateInvoicePDF = async (req: Request, res: Response) => {
  let doc: PDFKit.PDFDocument | null = null;

  try {
    const { invoiceId } = req.params as { invoiceId: string };

    const invoice = await Invoice.findById(invoiceId).populate({
      path: "orderId",
      populate: [
        { path: "items.productId", model: "Product" },
        {
          path: "userId",
          model: "User",
          populate: { path: "profile", model: "Profile" },
        },
      ],
    });

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    const cleanInvoiceNumber = invoice.invoiceNumber.replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    const filename = `invoice-${cleanInvoiceNumber}.pdf`;

    // Set response headers BEFORE creating PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Transfer-Encoding", "binary");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    // Create PDF document
    doc = new PDFDocument({ margin: 40 });

    // Pipe to response
    doc.pipe(res);

    const getUserFullName = (order: any) => {
      const user = order?.userId as any;
      const profile = user?.profile as any;
      if (profile?.firstName || profile?.lastName) {
        return `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
      }
      return user?.email?.split("@")[0] || "Customer";
    };

    // Add content to PDF
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("INVOICE", { align: "center" });
    doc.moveDown(0.5);

    const leftColumn = 40;
    const rightColumn = 300;

    doc.fontSize(9).font("Helvetica");
    doc.text(`Invoice Number:`, leftColumn, doc.y);
    doc.text(invoice.invoiceNumber, rightColumn, doc.y);

    doc.text(`Invoice Date:`, leftColumn, doc.y);
    doc.text(
      new Date(invoice.issueDate).toLocaleDateString(),
      rightColumn,
      doc.y,
    );

    doc.text(`Due Date:`, leftColumn, doc.y);
    doc.text(
      new Date(invoice.dueDate).toLocaleDateString(),
      rightColumn,
      doc.y,
    );

    doc.text(`Status:`, leftColumn, doc.y);
    doc.text(invoice.status, rightColumn, doc.y);

    doc.moveDown(0.5);

    const order = invoice.orderId as any;
    const customerName = getUserFullName(order);
    const customerEmail = order?.userId?.email || "";

    doc.font("Helvetica-Bold").fontSize(10).text("Bill To:", 40, doc.y);
    doc.font("Helvetica").fontSize(9);
    doc.text(customerName, 40, doc.y);
    if (customerEmail) {
      doc.text(customerEmail, 40, doc.y);
    }
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").text(`Order Number:`, 40, doc.y);
    doc.font("Helvetica").text(invoice.orderNumber, 150, doc.y - 12);
    doc.moveDown(0.5);

    const tableTop = doc.y + 10;
    const colPositions = { item: 40, qty: 280, unitPrice: 350, total: 450 };

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Item", colPositions.item, tableTop);
    doc.text("Qty", colPositions.qty, tableTop);
    doc.text("Unit Price (₦)", colPositions.unitPrice, tableTop);
    doc.text("Total (₦)", colPositions.total, tableTop);

    doc
      .moveTo(40, tableTop + 15)
      .lineTo(560, tableTop + 15)
      .stroke();

    let currentY = tableTop + 25;
    doc.font("Helvetica").fontSize(9);

    let subtotal = 0;
    const invoiceItems = invoice.items;

    if (invoiceItems && invoiceItems.length > 0) {
      for (const item of invoiceItems) {
        const productName = item.description || "Product";
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || 0;
        const total = quantity * unitPrice;
        subtotal += total;

        doc.text(productName.substring(0, 35), colPositions.item, currentY);
        doc.text(quantity.toString(), colPositions.qty, currentY);
        doc.text(unitPrice.toLocaleString(), colPositions.unitPrice, currentY);
        doc.text(total.toLocaleString(), colPositions.total, currentY);

        currentY = doc.y + 15;
      }
    }

    doc
      .moveTo(40, currentY - 5)
      .lineTo(560, currentY - 5)
      .stroke();

    const totalsStartX = 380;
    let totalsY = currentY + 10;

    doc.font("Helvetica-Bold");
    doc.text("Subtotal:", totalsStartX, totalsY);
    doc.font("Helvetica");
    doc.text(
      `₦${(invoice.subtotal || subtotal).toLocaleString()}`,
      totalsStartX + 70,
      totalsY,
    );

    totalsY = doc.y + 15;
    doc.font("Helvetica-Bold");
    doc.text("Discount:", totalsStartX, totalsY);
    doc.font("Helvetica");
    doc.text(
      `₦${(invoice.discount || 0).toLocaleString()}`,
      totalsStartX + 70,
      totalsY,
    );

    totalsY = doc.y + 15;
    doc.font("Helvetica-Bold");
    doc.text("Total:", totalsStartX, totalsY);
    doc.font("Helvetica");
    doc.text(
      `₦${(invoice.totalAmount || subtotal).toLocaleString()}`,
      totalsStartX + 70,
      totalsY,
    );

    if (invoice.depositAmount && invoice.depositAmount > 0) {
      totalsY = doc.y + 15;
      doc.text("Deposit:", totalsStartX, totalsY);
      doc.text(
        `₦${invoice.depositAmount.toLocaleString()}`,
        totalsStartX + 70,
        totalsY,
      );
    }

    if (invoice.remainingAmount && invoice.remainingAmount > 0) {
      totalsY = doc.y + 15;
      doc.text("Remaining:", totalsStartX, totalsY);
      doc.text(
        `₦${invoice.remainingAmount.toLocaleString()}`,
        totalsStartX + 70,
        totalsY,
      );
    }

    doc.moveDown(1);

    if (invoice.paymentInstructions) {
      doc.fontSize(8);
      doc.text("Payment Instructions:", { underline: true });
      doc.fontSize(8).text(invoice.paymentInstructions);
    }

    const pageHeight = doc.page.height;
    doc.fontSize(8);
    doc.text("Thank you for your business!", 40, pageHeight - 30, {
      align: "center",
    });

    // CRITICAL: End the document properly
    doc.end();

    // Handle any errors during PDF generation
    doc.on("error", (err) => {
      console.error("PDF generation error:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Error generating PDF" });
      }
    });
  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
    if (doc) {
      doc.end();
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// export const generateInvoicePDF = async (req: Request, res: Response) => {
//   let doc: PDFKit.PDFDocument | null = null;

//   try {
//     const { invoiceId } = req.params as { invoiceId: string };

//     const invoice = await Invoice.findById(invoiceId).populate({
//       path: "orderId",
//       populate: [
//         { path: "items.productId", model: "Product" },
//         {
//           path: "userId",
//           model: "User",
//           populate: { path: "profile", model: "Profile" },
//         },
//       ],
//     });

//     if (!invoice) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Invoice not found" });
//     }

//     const cleanInvoiceNumber = invoice.invoiceNumber.replace(
//       /[^a-zA-Z0-9-]/g,
//       "",
//     );
//     const filename = `invoice-${cleanInvoiceNumber}.pdf`;

//     doc = new PDFDocument({ margin: 40 });

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
//     res.setHeader("Content-Transfer-Encoding", "binary");
//     res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

//     doc.pipe(res);

//     const getUserFullName = (order: any) => {
//       const user = order?.userId as any;
//       const profile = user?.profile as any;
//       if (profile?.firstName || profile?.lastName) {
//         return `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
//       }
//       return user?.email?.split("@")[0] || "Customer";
//     };

//     doc
//       .fontSize(18)
//       .font("Helvetica-Bold")
//       .text("INVOICE", { align: "center" });
//     doc.moveDown(0.5);

//     const leftColumn = 40;
//     const rightColumn = 300;

//     doc.fontSize(9).font("Helvetica");
//     doc.text(`Invoice Number:`, leftColumn, doc.y);
//     doc.text(invoice.invoiceNumber, rightColumn, doc.y);

//     doc.text(`Invoice Date:`, leftColumn, doc.y);
//     doc.text(
//       new Date(invoice.issueDate).toLocaleDateString(),
//       rightColumn,
//       doc.y,
//     );

//     doc.text(`Due Date:`, leftColumn, doc.y);
//     doc.text(
//       new Date(invoice.dueDate).toLocaleDateString(),
//       rightColumn,
//       doc.y,
//     );

//     doc.text(`Status:`, leftColumn, doc.y);
//     doc.text(invoice.status, rightColumn, doc.y);

//     doc.moveDown(0.5);

//     const order = invoice.orderId as any;
//     const customerName = getUserFullName(order);
//     const customerEmail = order?.userId?.email || "";

//     doc.font("Helvetica-Bold").fontSize(10).text("Bill To:", 40, doc.y);
//     doc.font("Helvetica").fontSize(9);
//     doc.text(customerName, 40, doc.y);
//     if (customerEmail) {
//       doc.text(customerEmail, 40, doc.y);
//     }
//     doc.moveDown(0.5);

//     doc.font("Helvetica-Bold").text(`Order Number:`, 40, doc.y);
//     doc.font("Helvetica").text(invoice.orderNumber, 150, doc.y - 12);
//     doc.moveDown(0.5);

//     const tableTop = doc.y + 10;
//     const colPositions = { item: 40, qty: 280, unitPrice: 350, total: 450 };

//     doc.font("Helvetica-Bold").fontSize(9);
//     doc.text("Item", colPositions.item, tableTop);
//     doc.text("Qty", colPositions.qty, tableTop);
//     doc.text("Unit Price (₦)", colPositions.unitPrice, tableTop);
//     doc.text("Total (₦)", colPositions.total, tableTop);

//     doc
//       .moveTo(40, tableTop + 15)
//       .lineTo(560, tableTop + 15)
//       .stroke();

//     let currentY = tableTop + 25;
//     doc.font("Helvetica").fontSize(9);

//     let subtotal = 0;
//     const invoiceItems = invoice.items;

//     if (invoiceItems && invoiceItems.length > 0) {
//       for (const item of invoiceItems) {
//         const productName = item.description || "Product";
//         const quantity = item.quantity || 1;
//         const unitPrice = item.unitPrice || 0;
//         const total = quantity * unitPrice;
//         subtotal += total;

//         doc.text(productName.substring(0, 35), colPositions.item, currentY);
//         doc.text(quantity.toString(), colPositions.qty, currentY);
//         doc.text(unitPrice.toLocaleString(), colPositions.unitPrice, currentY);
//         doc.text(total.toLocaleString(), colPositions.total, currentY);

//         currentY = doc.y + 15;
//       }
//     }

//     doc
//       .moveTo(40, currentY - 5)
//       .lineTo(560, currentY - 5)
//       .stroke();

//     const totalsStartX = 380;
//     let totalsY = currentY + 10;

//     doc.font("Helvetica-Bold");
//     doc.text("Subtotal:", totalsStartX, totalsY);
//     doc.font("Helvetica");
//     doc.text(
//       `₦${(invoice.subtotal || subtotal).toLocaleString()}`,
//       totalsStartX + 70,
//       totalsY,
//     );

//     totalsY = doc.y + 15;
//     doc.font("Helvetica-Bold");
//     doc.text("Discount:", totalsStartX, totalsY);
//     doc.font("Helvetica");
//     doc.text(
//       `₦${(invoice.discount || 0).toLocaleString()}`,
//       totalsStartX + 70,
//       totalsY,
//     );

//     totalsY = doc.y + 15;
//     doc.font("Helvetica-Bold");
//     doc.text("Total:", totalsStartX, totalsY);
//     doc.font("Helvetica");
//     doc.text(
//       `₦${(invoice.totalAmount || subtotal).toLocaleString()}`,
//       totalsStartX + 70,
//       totalsY,
//     );

//     if (invoice.depositAmount && invoice.depositAmount > 0) {
//       totalsY = doc.y + 15;
//       doc.text("Deposit:", totalsStartX, totalsY);
//       doc.text(
//         `₦${invoice.depositAmount.toLocaleString()}`,
//         totalsStartX + 70,
//         totalsY,
//       );
//     }

//     if (invoice.remainingAmount && invoice.remainingAmount > 0) {
//       totalsY = doc.y + 15;
//       doc.text("Remaining:", totalsStartX, totalsY);
//       doc.text(
//         `₦${invoice.remainingAmount.toLocaleString()}`,
//         totalsStartX + 70,
//         totalsY,
//       );
//     }

//     doc.moveDown(1);

//     if (invoice.paymentInstructions) {
//       doc.fontSize(8);
//       doc.text("Payment Instructions:", { underline: true });
//       doc.fontSize(8).text(invoice.paymentInstructions);
//     }

//     const pageHeight = doc.page.height;
//     doc.fontSize(8);
//     doc.text("Thank you for your business!", 40, pageHeight - 30, {
//       align: "center",
//     });

//     doc.end();

//     doc.on("error", (err) => {
//       console.error("PDF generation error:", err);
//       if (!res.headersSent) {
//         res
//           .status(500)
//           .json({ success: false, message: "Error generating PDF" });
//       }
//     });
//   } catch (error: any) {
//     console.error("Error generating invoice PDF:", error);
//     if (doc) {
//       doc.end();
//     }
//     if (!res.headersSent) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }
// };

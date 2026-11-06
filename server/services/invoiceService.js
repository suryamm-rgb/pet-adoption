import PDFDocument from "pdfkit";
import { Booking } from "../models/index.js";
import { forbidden, notFound } from "../utils/http.js";

const rs = (paise) => `Rs ${(paise / 100).toLocaleString("en-IN")}`;
const date = (d) => new Date(d).toISOString().slice(0, 10);

export async function streamInvoice(user, bookingId, res) {
  const b = await Booking.findById(bookingId).populate("ownerId", "name email").populate("caretakerId", "name");
  if (!b) throw notFound();
  if (!b.ownerId._id.equals(user._id) && !user.roles.includes("admin")) throw forbidden();
  if (!["PAID", "IN_CARE", "COMPLETED", "DISPUTED", "REFUNDED", "CANCELLED"].includes(b.status) || b.ownerPays == null) throw notFound("No invoice yet");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="invoice-${b._id}.pdf"`);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(22).text("PawStay invoice");
  doc.moveDown().fontSize(11).fillColor("#555").text(`Invoice for booking ${b._id}`).text(`Issued: ${date(b.updatedAt)}`);
  doc.moveDown().fillColor("#000").text(`Billed to: ${b.ownerId.name} (${b.ownerId.email})`).text(`Caretaker: ${b.caretakerId.name}`).text(`Stay: ${date(b.startDate)} to ${date(b.endDate)} (${b.days} days)`);
  doc.moveDown();
  const row = (label, value) => doc.text(label, { continued: true }).text(value, { align: "right" });
  row(`Care (${rs(b.pricePerDay)} x ${b.days})`, rs(b.careAmount));
  row("Platform fee", rs(b.platformFee));
  doc.moveDown(0.5).fontSize(13).text(`Total paid: ${rs(b.ownerPays)}`, { align: "right" });
  if (b.refundAmount) doc.fontSize(11).text(`Refunded: ${rs(b.refundAmount)}`, { align: "right" });
  doc.end();
}

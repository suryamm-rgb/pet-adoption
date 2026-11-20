import { Report } from "../models/index.js";
import * as reports from "../services/reportService.js";
import * as reviews from "../services/reviewService.js";

export const report = async (req, res) => res.status(201).json(await reports.createReport(req.user, req.body));
export const reply = async (req, res) => res.json(await reviews.replyToReview(req.user, req.params.id, req.body.text));
export const listReports = async (req, res) =>
  res.json(await Report.find({ status: req.query.status ?? "open" }).sort({ createdAt: -1 }).limit(200).populate("reporterId", "name email"));
export const resolveReport = async (req, res) => res.json(await reports.resolveReport(req.user, req.params.id, req.body));

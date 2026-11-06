import { Router } from "express";
import * as c from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/http.js";

const r = Router();
r.use(requireAuth);
r.get("/", wrap(c.list));
r.patch("/read-all", wrap(c.readAll));
r.patch("/:id/read", wrap(c.readOne));
export default r;

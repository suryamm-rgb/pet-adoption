import { Router } from "express";
import * as c from "../controllers/caretakerController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { wrap } from "../utils/http.js";
import { caretaker, payoutSetup } from "../utils/schemas.js";

const r = Router();
r.get("/", validate(caretaker.search, "query"), wrap(c.search));

const mine = Router();
mine.use(requireAuth, requireRole("caretaker"));
mine.get("/profile", wrap(c.mine));
mine.put("/profile", validate(caretaker.profile), wrap(c.update));
mine.post("/documents/:kind(idProof|addressProof|photos)", upload("files", { private: true }), wrap(c.documents));
mine.post("/submit", wrap(c.submit));
mine.post("/payout-account", validate(payoutSetup), wrap(c.payoutAccount));
mine.get("/earnings", wrap(c.earnings));
mine.get("/requests", wrap(c.requests));
r.use("/me", mine);

r.get("/:id", wrap(c.get));
r.get("/:id/reviews", wrap(c.reviews));
export default r;

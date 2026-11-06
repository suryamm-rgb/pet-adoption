import { Router } from "express";
import * as c from "../controllers/petController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { wrap } from "../utils/http.js";
import { pet } from "../utils/schemas.js";

const r = Router();
r.use(requireAuth, requireRole("owner"));
r.post("/", validate(pet.body), wrap(c.create));
r.get("/mine", wrap(c.mine));
r.get("/:id", wrap(c.get));
r.put("/:id", validate(pet.update), wrap(c.update));
r.delete("/:id", wrap(c.remove));
r.get("/:id/history", wrap(c.history));
r.post("/:id/vaccination", upload("files"), wrap(c.vaccination));
r.post("/:id/photos", upload("files"), wrap(c.photos));
export default r;

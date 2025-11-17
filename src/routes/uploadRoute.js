import express from "express";
import passport from "../../middleware/passport.js";
import { createDesign, updateDesign, getDesigns, getOne, deleteDesign } from "../controllers/uploadController.js";


const router = express.Router();

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  createDesign
);

// Update an existing design
router.put(
  "/:designId",
  passport.authenticate("jwt", { session: false }),
  updateDesign
);

router.get("/", passport.authenticate("jwt", { session: false }), getDesigns);

router.get("/:designId", passport.authenticate("jwt", { session: false }), getOne);

router.delete("/:designId", passport.authenticate("jwt", { session: false }), deleteDesign);


export default router;
import { Router } from "express";
import {
  registerContent,
  verifyContent,
  getRecord
} from "../controllers/blockchain.controller.js";

const router = Router();

router.post("/register", registerContent);
router.get("/verify/:contentHash", verifyContent);
router.get("/records/:contentHash", getRecord);

export default router;

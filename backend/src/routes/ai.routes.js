import multer from "multer";
import { Router } from "express";
import {
  analyzeText,
  analyzeImage
} from "../controllers/ai.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error("Upload an image file.");
      error.status = 415;
      callback(error);
      return;
    }
    callback(null, true);
  }
});

router.post("/text", analyzeText);
router.post("/image", upload.single("file"), analyzeImage);

export default router;

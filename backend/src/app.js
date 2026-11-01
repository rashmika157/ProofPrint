import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import blockchainRoutes from "./routes/blockchain.routes.js";
import historyRoutes from "./routes/history.routes.js";
import { frontendUrl } from "./config/env.js";
import {
  errorHandler,
  notFoundHandler
} from "./middleware/error.middleware.js";

const app = express();

app.use(cors({
  origin: frontendUrl
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRoutes);
app.use("/api/analyze", aiRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/history", historyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

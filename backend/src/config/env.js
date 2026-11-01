import "dotenv/config";

export const port = Number.parseInt(process.env.PORT || "3000", 10);
export const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
export const aiServiceUrl = (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

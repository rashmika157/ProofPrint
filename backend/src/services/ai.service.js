import axios from "axios";
import FormData from "form-data";
import { aiServiceUrl } from "../config/env.js";

const aiClient = axios.create({
  baseURL: aiServiceUrl,
  timeout: 30_000
});

function createAiServiceError(error) {
  if (error.response) {
    const upstream = error.response.data;
    const detail = upstream?.detail;
    let message;

    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail[0]?.msg) {
      message = detail[0].msg;
    } else {
      message = "The AI service rejected the request.";
    }

    const serviceError = new Error(message);
    serviceError.status = error.response.status;
    serviceError.details = upstream?.detail;
    return serviceError;
  }

  const connectionError = new Error(
    `Unable to connect to the AI service at ${aiServiceUrl}.`
  );
  connectionError.status = 502;
  return connectionError;
}

export async function analyzeTextWithAi(text) {
  try {
    return await aiClient.post("/analyze/text", { text });
  } catch (error) {
    throw createAiServiceError(error);
  }
}

export async function analyzeImageWithAi(file) {
  try {
    const form = new FormData();
    form.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    return await aiClient.post("/analyze/image", form, {
      headers: form.getHeaders(),
      maxContentLength: 11 * 1024 * 1024,
      maxBodyLength: 11 * 1024 * 1024
    });
  } catch (error) {
    throw createAiServiceError(error);
  }
}

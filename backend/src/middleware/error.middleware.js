import { ProofPrintServiceError } from "../../../blockchain/service/ProofPrintService.js";
import { DatabaseError } from "../repositories/content-record.repository.js";

export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, _request, response, _next) {
  let status = Number.isInteger(error.status) ? error.status : 500;
  let message = error.message;

  if (error instanceof DatabaseError) {
    status = error.code === "INVALID_DATABASE_RECORD"
      ? 400
      : error.code === "DUPLICATE_DATABASE_RECORD"
        ? 409
        : 500;
  }

  if (error instanceof ProofPrintServiceError) {
    const codeStatusMap = {
      INVALID_CONTENT_HASH: 400,
      INVALID_ANALYSIS_SUMMARY: 400,
      ARTIFACT_NOT_FOUND: 503,
      DEPLOYMENT_NOT_FOUND: 503,
      INVALID_DEPLOYMENT: 503,
      CONNECTION_FAILED: 502,
      UNSUPPORTED_NETWORK: 502,
      CONTRACT_NOT_DEPLOYED: 503,
      DUPLICATE_REGISTRATION: 409,
      RECORD_NOT_FOUND: 404,
      REGISTRATION_EVENT_MISSING: 502,
      DEPLOYMENT_FAILED: 502
    };

    status = codeStatusMap[error.code] || 502;
  }

  if (error.name === "MulterError") {
    status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = error.code === "LIMIT_FILE_SIZE"
      ? "The uploaded image is larger than 10 MB."
      : "Invalid image upload.";
  }

  const responseBody = {
    error: {
      status,
      message: status === 500 ? "Internal server error" : message
    }
  };

  if (error.details !== undefined) {
    responseBody.error.details = error.details;
  }

  if (error.code !== undefined) {
    responseBody.error.code = error.code;
  }

  if (status === 500) {
    console.error(error);
  }

  response.status(status).json(responseBody);
}

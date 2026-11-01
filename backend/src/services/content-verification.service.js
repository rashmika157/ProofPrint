import { createHash } from "node:crypto";
import {
  getAnalysisRecordByHash,
  insertAnalysisRecord,
  DatabaseError
} from "../repositories/content-record.repository.js";
import {
  registerBlockchainContent,
  verifyBlockchainContent,
  getBlockchainRecord,
  ProofPrintServiceError
} from "./blockchain.service.js";

function validateAiResult(aiResult, contentType) {
  if (
    !aiResult ||
    aiResult.content_type !== contentType ||
    typeof aiResult.ai_probability_percent !== "number" ||
    typeof aiResult.confidence_score !== "number" ||
    typeof aiResult.classification !== "string"
  ) {
    const error = new Error("The AI service returned an incomplete analysis result.");
    error.status = 502;
    throw error;
  }

  const humanProbability = contentType === "text"
    ? aiResult.human_probability_percent
    : aiResult.non_ai_probability_percent;

  if (typeof humanProbability !== "number") {
    const error = new Error("The AI service returned an incomplete analysis result.");
    error.status = 502;
    throw error;
  }

  if (
    aiResult.ai_probability_percent < 0 || aiResult.ai_probability_percent > 100 ||
    humanProbability < 0 || humanProbability > 100 ||
    aiResult.confidence_score < 0 || aiResult.confidence_score > 100
  ) {
    const error = new Error("The AI service returned invalid analysis values.");
    error.status = 502;
    throw error;
  }

  return {
    aiGeneratedProbability: aiResult.ai_probability_percent,
    humanWrittenProbability: humanProbability,
    classification: aiResult.classification,
    confidenceScore: aiResult.confidence_score
  };
}

function createAnalysisSummary(contentType, aiResult) {
  return [
    `${contentType} analysis`,
    `${aiResult.classification}`,
    `confidence ${aiResult.confidence_score}%`
  ].join("; ").slice(0, 500);
}

function createContentHash(data) {
  return `0x${createHash("sha256").update(data).digest("hex")}`;
}

async function persistVerifiedContent({ content, contentBuffer, contentType, aiResult }) {
  const contentHash = createContentHash(
    contentBuffer ?? Buffer.from(content, "utf8")
  );

  if (getAnalysisRecordByHash(contentHash)) {
    throw new DatabaseError(
      "An analysis record already exists for this content.",
      "DUPLICATE_DATABASE_RECORD"
    );
  }

  const databaseValues = validateAiResult(aiResult, contentType);

  let blockchainResult;
  try {
    blockchainResult = await registerBlockchainContent(
      contentHash,
      createAnalysisSummary(contentType, aiResult)
    );
  } catch (error) {
    if (
      !(error instanceof ProofPrintServiceError) ||
      error.code !== "DUPLICATE_REGISTRATION"
    ) {
      throw error;
    }

    const verification = await verifyBlockchainContent(contentHash);
    if (!verification.registered) {
      throw error;
    }

    const blockchainRecord = await getBlockchainRecord(contentHash);
    let recoveredRecord = getAnalysisRecordByHash(contentHash);
    if (!recoveredRecord) {
      try {
        recoveredRecord = insertAnalysisRecord({
          contentHash,
          contentType,
          ...databaseValues,
          blockchainTransactionHash: null,
          blockchainTimestamp: blockchainRecord.timestamp
        });
      } catch (databaseError) {
        recoveredRecord = getAnalysisRecordByHash(contentHash);
        if (!recoveredRecord) {
          throw databaseError;
        }
      }
    }

    return {
      contentHash,
      transactionHash: null,
      timestamp: blockchainRecord.timestamp,
      blockchainRecord,
      databaseRecord: recoveredRecord,
      recovered: true
    };
  }

  if (
    typeof blockchainResult?.transactionHash !== "string" ||
    typeof blockchainResult?.timestamp !== "string"
  ) {
    const error = new Error("The blockchain registration returned incomplete transaction data.");
    error.status = 502;
    throw error;
  }

  let databaseRecord;
  try {
    databaseRecord = insertAnalysisRecord({
      contentHash,
      contentType,
      ...databaseValues,
      blockchainTransactionHash: blockchainResult.transactionHash,
      blockchainTimestamp: blockchainResult.timestamp
    });
  } catch (databaseError) {
    const recovered = getAnalysisRecordByHash(contentHash);
    if (!recovered) {
      try {
        const verification = await verifyBlockchainContent(contentHash);
        if (!verification.registered) {
          throw databaseError;
        }
        databaseRecord = insertAnalysisRecord({
          contentHash,
          contentType,
          ...databaseValues,
          blockchainTransactionHash: blockchainResult.transactionHash,
          blockchainTimestamp: blockchainResult.timestamp
        });
      } catch (recoveryError) {
        if (recoveryError !== databaseError) {
          throw recoveryError;
        }
        throw databaseError;
      }
    } else {
      databaseRecord = recovered;
    }
  }

  return {
    contentHash,
    transactionHash: blockchainResult.transactionHash,
    timestamp: blockchainResult.timestamp,
    blockchainRecord: blockchainResult.record ?? null,
    databaseRecord,
    recovered: false
  };
}

export function persistTextAnalysis(text, aiResult) {
  return persistVerifiedContent({
    content: text,
    contentType: "text",
    aiResult
  });
}

export function persistImageAnalysis(imageBuffer, aiResult) {
  return persistVerifiedContent({
    contentBuffer: imageBuffer,
    contentType: "image",
    aiResult
  });
}

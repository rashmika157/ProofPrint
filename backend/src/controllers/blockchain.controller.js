import {
  registerBlockchainContent,
  verifyBlockchainContent,
  getBlockchainRecord
} from "../services/blockchain.service.js";
import {
  getAnalysisRecordByHash,
  insertAnalysisRecord
} from "../repositories/content-record.repository.js";

function validateContentHash(contentHash) {
  if (
    typeof contentHash !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/i.test(contentHash) ||
    /^0x0{64}$/i.test(contentHash)
  ) {
    const error = new Error(
      "Content hash must be a non-zero, 0x-prefixed 32-byte SHA-256 digest."
    );
    error.status = 400;
    error.code = "INVALID_CONTENT_HASH";
    throw error;
  }
}

function validateAnalysisSummary(analysisSummary) {
  if (typeof analysisSummary !== "string" || !analysisSummary.trim()) {
    const error = new Error("AI analysis summary must be a non-empty string.");
    error.status = 400;
    error.code = "INVALID_ANALYSIS_SUMMARY";
    throw error;
  }

  if (analysisSummary.length > 500) {
    const error = new Error("AI analysis summary must be 500 characters or fewer.");
    error.status = 400;
    error.code = "INVALID_ANALYSIS_SUMMARY";
    throw error;
  }
}

function getAiAnalysisValues(requestBody) {
  const aiAnalysis = requestBody.aiAnalysis ?? requestBody.analysis ?? {};

  const contentType = requestBody.contentType;
  const aiGeneratedProbability =
    requestBody.aiGeneratedProbability ??
    aiAnalysis.ai_generated_probability_percent ??
    aiAnalysis.ai_probability_percent;
  const humanWrittenProbability =
    requestBody.humanWrittenProbability ??
    aiAnalysis.human_written_probability_percent ??
    aiAnalysis.human_probability_percent ??
    aiAnalysis.non_ai_probability_percent;
  const classification =
    requestBody.classification ??
    aiAnalysis.label ??
    aiAnalysis.classification ??
    aiAnalysis.final_classification;
  const confidenceScore =
    requestBody.confidenceScore ??
    aiAnalysis.confidence_score;

  const hasAiFields = contentType !== undefined ||
    aiGeneratedProbability !== undefined ||
    humanWrittenProbability !== undefined ||
    classification !== undefined ||
    confidenceScore !== undefined ||
    Object.keys(aiAnalysis).length > 0;

  if (!hasAiFields) {
    return null;
  }

  if (
    !["text", "image"].includes(contentType) ||
    typeof aiGeneratedProbability !== "number" ||
    typeof humanWrittenProbability !== "number" ||
    typeof classification !== "string" ||
    !classification.trim() ||
    typeof confidenceScore !== "number"
  ) {
    const error = new Error(
      "Complete AI analysis fields and a valid contentType are required when persisting blockchain registration."
    );
    error.status = 400;
    error.code = "INVALID_DATABASE_RECORD";
    throw error;
  }

  if (
    aiGeneratedProbability < 0 || aiGeneratedProbability > 100 ||
    humanWrittenProbability < 0 || humanWrittenProbability > 100 ||
    confidenceScore < 0 || confidenceScore > 100
  ) {
    const error = new Error("AI probability and confidence values must be between 0 and 100.");
    error.status = 400;
    error.code = "INVALID_DATABASE_RECORD";
    throw error;
  }

  return {
    contentType,
    aiGeneratedProbability,
    humanWrittenProbability,
    classification: classification.trim(),
    confidenceScore
  };
}

export async function registerContent(request, response, next) {
  try {
    const { contentHash, analysisSummary } = request.body ?? {};
    const aiAnalysisValues = getAiAnalysisValues(request.body ?? {});

    validateContentHash(contentHash);
    validateAnalysisSummary(analysisSummary);

    if (aiAnalysisValues && getAnalysisRecordByHash(contentHash)) {
      const error = new Error(
        "An analysis record already exists for this content hash."
      );
      error.status = 409;
      error.code = "DUPLICATE_DATABASE_RECORD";
      throw error;
    }

    const result = await registerBlockchainContent(
      contentHash,
      analysisSummary.trim()
    );

    if (aiAnalysisValues) {
      insertAnalysisRecord({
        contentHash,
        ...aiAnalysisValues,
        blockchainTransactionHash: result.transactionHash,
        blockchainTimestamp: result.timestamp
      });
    }

    response.status(201).json({
      transactionHash: result.transactionHash,
      timestamp: result.timestamp,
      record: result.record
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyContent(request, response, next) {
  try {
    const { contentHash } = request.params;
    validateContentHash(contentHash);

    const result = await verifyBlockchainContent(contentHash);
    const databaseRecord = result.registered
      ? getAnalysisRecordByHash(contentHash)
      : null;

    response.status(200).json({
      ...result,
      transactionHash: databaseRecord?.blockchainTransactionHash ?? null,
      timestamp: result.record?.timestamp ?? databaseRecord?.blockchainTimestamp ?? null,
      databaseRecord
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecord(request, response, next) {
  try {
    const { contentHash } = request.params;
    validateContentHash(contentHash);

    const record = await getBlockchainRecord(contentHash);
    response.status(200).json({
      record
    });
  } catch (error) {
    next(error);
  }
}

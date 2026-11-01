import {
  analyzeTextWithAi,
  analyzeImageWithAi
} from "../services/ai.service.js";
import {
  persistTextAnalysis,
  persistImageAnalysis
} from "../services/content-verification.service.js";

export async function analyzeText(request, response, next) {
  try {
    const { text } = request.body ?? {};

    if (typeof text !== "string" || !text.trim()) {
      const error = new Error("Text input must contain at least one word.");
      error.status = 400;
      throw error;
    }

    if (text.length > 100_000) {
      const error = new Error("Text input is larger than 100,000 characters.");
      error.status = 413;
      throw error;
    }

    const aiResponse = await analyzeTextWithAi(text);
    const persistence = await persistTextAnalysis(
      text,
      normalizeTextAiResult(aiResponse.data)
    );
    response.status(aiResponse.status).json({
      ...aiResponse.data,
      contentHash: persistence.contentHash,
      blockchain: {
        transactionHash: persistence.transactionHash,
        timestamp: persistence.timestamp,
        record: persistence.blockchainRecord
      },
      databaseRecord: persistence.databaseRecord,
      recovered: persistence.recovered
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeImage(request, response, next) {
  try {
    if (!request.file) {
      const error = new Error("An image file is required.");
      error.status = 400;
      throw error;
    }

    const aiResponse = await analyzeImageWithAi(request.file);
    const persistence = await persistImageAnalysis(
      request.file.buffer,
      normalizeImageAiResult(aiResponse.data)
    );
    response.status(aiResponse.status).json({
      ...aiResponse.data,
      contentHash: persistence.contentHash,
      blockchain: {
        transactionHash: persistence.transactionHash,
        timestamp: persistence.timestamp,
        record: persistence.blockchainRecord
      },
      databaseRecord: persistence.databaseRecord,
      recovered: persistence.recovered
    });
  } catch (error) {
    next(error);
  }
}

function normalizeTextAiResult(result) {
  return {
    content_type: result.content_type,
    ai_probability_percent: result.ai_probability_percent ?? result.ai_generated_probability_percent,
    human_probability_percent: result.human_probability_percent ?? result.human_written_probability_percent,
    classification: result.label,
    confidence_score: result.confidence_score
  };
}

function normalizeImageAiResult(result) {
  return {
    content_type: result.content_type,
    ai_probability_percent: result.ai_probability_percent ?? result.ai_generated_probability_percent,
    non_ai_probability_percent: result.non_ai_probability_percent,
    classification: result.label,
    confidence_score: result.confidence_score
  };
}

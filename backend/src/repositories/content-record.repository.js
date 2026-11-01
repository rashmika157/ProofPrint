import database from "../config/database.js";

export class DatabaseError extends Error {
  constructor(message, code = "DATABASE_ERROR", options = {}) {
    super(message, options);
    this.name = "DatabaseError";
    this.code = code;
  }
}

function validateRecord(record) {
  if (
    typeof record.contentHash !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/i.test(record.contentHash) ||
    /^0x0{64}$/i.test(record.contentHash)
  ) {
    throw new DatabaseError(
      "contentHash must be a non-zero, 0x-prefixed 32-byte SHA-256 digest.",
      "INVALID_DATABASE_RECORD"
    );
  }

  if (!["text", "image"].includes(record.contentType)) {
    throw new DatabaseError(
      "contentType must be either 'text' or 'image'.",
      "INVALID_DATABASE_RECORD"
    );
  }
}

export function insertAnalysisRecord(record) {
  try {
    validateRecord(record);

    database.prepare(`
      INSERT INTO content_records (
        content_hash,
        content_type,
        ai_generated_probability,
        human_written_probability,
        classification,
        confidence_score,
        blockchain_transaction_hash,
        blockchain_timestamp
      ) VALUES (
        @contentHash,
        @contentType,
        @aiGeneratedProbability,
        @humanWrittenProbability,
        @classification,
        @confidenceScore,
        @blockchainTransactionHash,
        @blockchainTimestamp
      )
    `).run({
      contentHash: record.contentHash,
      contentType: record.contentType,
      aiGeneratedProbability: record.aiGeneratedProbability ?? null,
      humanWrittenProbability: record.humanWrittenProbability ?? null,
      classification: record.classification ?? null,
      confidenceScore: record.confidenceScore ?? null,
      blockchainTransactionHash: record.blockchainTransactionHash ?? null,
      blockchainTimestamp: record.blockchainTimestamp ?? null
    });

    return getAnalysisRecordByHash(record.contentHash);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new DatabaseError(
        "An analysis record already exists for this content hash.",
        "DUPLICATE_DATABASE_RECORD",
        { cause: error }
      );
    }

    throw new DatabaseError("Unable to insert the analysis record.", "DATABASE_ERROR", {
      cause: error
    });
  }
}

export function getAnalysisRecordByHash(contentHash) {
  try {
    if (
      typeof contentHash !== "string" ||
      !/^0x[0-9a-fA-F]{64}$/i.test(contentHash) ||
      /^0x0{64}$/i.test(contentHash)
    ) {
      throw new DatabaseError(
        "contentHash must be a non-zero, 0x-prefixed 32-byte SHA-256 digest.",
        "INVALID_DATABASE_RECORD"
      );
    }

    return database.prepare(`
      SELECT
        id,
        content_hash AS contentHash,
        content_type AS contentType,
        ai_generated_probability AS aiGeneratedProbability,
        human_written_probability AS humanWrittenProbability,
        classification,
        confidence_score AS confidenceScore,
        blockchain_transaction_hash AS blockchainTransactionHash,
        blockchain_timestamp AS blockchainTimestamp,
        created_at AS createdAt
      FROM content_records
      WHERE content_hash = @contentHash
    `).get({ contentHash }) ?? null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError("Unable to retrieve the analysis record.", "DATABASE_ERROR", {
      cause: error
    });
  }
}

export function getAllAnalysisRecords() {
  try {
    return database.prepare(`
      SELECT
        id,
        content_hash AS contentHash,
        content_type AS contentType,
        ai_generated_probability AS aiGeneratedProbability,
        human_written_probability AS humanWrittenProbability,
        classification,
        confidence_score AS confidenceScore,
        blockchain_transaction_hash AS blockchainTransactionHash,
        blockchain_timestamp AS blockchainTimestamp,
        created_at AS createdAt
      FROM content_records
      ORDER BY id DESC
    `).all();
  } catch (error) {
    throw new DatabaseError("Unable to retrieve analysis records.", "DATABASE_ERROR", {
      cause: error
    });
  }
}

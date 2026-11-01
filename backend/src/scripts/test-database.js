import database from "../config/database.js";
import {
  insertAnalysisRecord,
  getAnalysisRecordByHash,
  getAllAnalysisRecords
} from "../repositories/content-record.repository.js";

const contentHash = `0x${Buffer.from(
  "ProofPrint database test"
).toString("hex").padStart(64, "0").slice(-64)}`;

try {
  database.exec("BEGIN");

  const inserted = insertAnalysisRecord({
    contentHash,
    contentType: "text",
    aiGeneratedProbability: 42.5,
    humanWrittenProbability: 57.5,
    classification: "likely_human",
    confidenceScore: 53.2,
    blockchainTransactionHash: null,
    blockchainTimestamp: null
  });

  const retrieved = getAnalysisRecordByHash(contentHash);
  const allRecords = getAllAnalysisRecords();

  if (!inserted || retrieved?.contentHash !== contentHash) {
    throw new Error("Inserted record was not returned or retrieved correctly.");
  }

  console.log("Database test passed.");
  console.log(JSON.stringify(inserted, null, 2));
  console.log(`Total records visible in test transaction: ${allRecords.length}`);
} finally {
  if (database.inTransaction) {
    database.exec("ROLLBACK");
  }
}

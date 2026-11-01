import assert from "node:assert/strict";
import { sha256, toUtf8Bytes } from "ethers";
import { ProofPrintService } from "../service/ProofPrintService.js";

async function main() {
  const service = new ProofPrintService();
  const contentHash = sha256(toUtf8Bytes(`ProofPrint service test ${Date.now()}`));
  const analysisSummary = "Local service smoke test; no sensitive information.";

  const registration = await service.registerContent(contentHash, analysisSummary);
  assert.ok(registration.transactionHash.startsWith("0x"));
  assert.ok(BigInt(registration.timestamp) > 0n);
  assert.equal(registration.record.contentHash, contentHash);
  assert.equal(registration.record.analysisSummary, analysisSummary);

  const verification = await service.verifyContent(contentHash);
  assert.equal(verification.registered, true);
  assert.equal(verification.result, "registered");
  assert.equal(verification.record.registrant, registration.record.registrant);
  await assert.rejects(
    service.registerContent(contentHash, analysisSummary),
    (error) => error.code === "DUPLICATE_REGISTRATION"
  );

  const unknownHash = sha256(toUtf8Bytes(`Unknown ProofPrint content ${Date.now()}`));
  const unknownVerification = await service.verifyContent(unknownHash);
  assert.equal(unknownVerification.registered, false);
  assert.equal(unknownVerification.result, "not_registered");
  assert.equal(unknownVerification.record, null);
  await assert.rejects(
    service.getRecord(unknownHash),
    (error) => error.code === "RECORD_NOT_FOUND"
  );
  await assert.rejects(
    service.verifyContent("not-a-sha256-hash"),
    (error) => error.code === "INVALID_CONTENT_HASH"
  );

  console.log("Service smoke test passed.");
  console.log(`Registration transaction: ${registration.transactionHash}`);
  console.log(`Registration timestamp: ${registration.timestamp}`);
  console.log(`Verified record: ${JSON.stringify(verification.record, null, 2)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

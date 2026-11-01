import assert from "node:assert/strict";
import { expect } from "chai";
import { network } from "hardhat";
import { describe, it } from "mocha";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

describe("ProofPrintRegistry", function () {
  async function deployRegistry() {
    const { ethers } = await network.getOrCreate();
    const registry = await ethers.deployContract("ProofPrintRegistry");
    await registry.waitForDeployment();
    return { ethers, registry };
  }

  it("runs on the expected local chain with funded accounts", async function () {
    const { ethers } = await deployRegistry();
    const accounts = await ethers.getSigners();
    const { chainId } = await ethers.provider.getNetwork();

    assert.ok(accounts.length > 0);
    assert.equal(chainId, 31337n);
  });

  it("registers a SHA-256 hash and emits the registration event", async function () {
    const { ethers, registry } = await deployRegistry();
    const [registrant] = await ethers.getSigners();
    const contentHash = ethers.sha256(ethers.toUtf8Bytes("ProofPrint sample content"));
    const summary = "No manipulation signals detected.";

    await expect(registry.registerContent(contentHash, summary))
      .to.emit(registry, "VerificationRegistered")
      .withArgs(contentHash, registrant.address, anyValue);

    assert.equal(await registry.verifyContent(contentHash), true);
  });

  it("rejects duplicate registration", async function () {
    const { ethers, registry } = await deployRegistry();
    const contentHash = ethers.sha256(ethers.toUtf8Bytes("duplicate content"));

    await registry.registerContent(contentHash, "Initial analysis.");
    await expect(registry.registerContent(contentHash, "Replacement analysis."))
      .to.be.revertedWithCustomError(registry, "DuplicateContentHash")
      .withArgs(contentHash);
  });

  it("retrieves the full record by hash", async function () {
    const { ethers, registry } = await deployRegistry();
    const [registrant] = await ethers.getSigners();
    const contentHash = ethers.sha256(ethers.toUtf8Bytes("retrievable content"));
    const summary = "Analysis completed; no manipulation detected.";

    await registry.registerContent(contentHash, summary);
    const record = await registry.getVerificationRecord(contentHash);

    assert.equal(record.contentHash, contentHash);
    assert.equal(record.registrant, registrant.address);
    assert.ok(record.timestamp > 0n);
    assert.equal(record.analysisSummary, summary);
  });

  it("returns false and reverts retrieval for an unknown hash", async function () {
    const { ethers, registry } = await deployRegistry();
    const unknownHash = ethers.sha256(ethers.toUtf8Bytes("unknown content"));

    assert.equal(await registry.verifyContent(unknownHash), false);
    await expect(registry.getVerificationRecord(unknownHash))
      .to.be.revertedWithCustomError(registry, "VerificationRecordNotFound")
      .withArgs(unknownHash);
  });

  it("rejects the zero hash", async function () {
    const { ethers, registry } = await deployRegistry();

    await expect(registry.registerContent(ethers.ZeroHash, "Analysis."))
      .to.be.revertedWithCustomError(registry, "InvalidContentHash");
  });
});

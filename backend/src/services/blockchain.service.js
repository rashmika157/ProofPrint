import {
  ProofPrintService,
  ProofPrintServiceError
} from "../../../blockchain/service/ProofPrintService.js";

export const proofPrintBlockchain = new ProofPrintService();

export {
  ProofPrintServiceError
};

export async function registerBlockchainContent(contentHash, analysisSummary) {
  return proofPrintBlockchain.registerContent(contentHash, analysisSummary);
}

export async function verifyBlockchainContent(contentHash) {
  return proofPrintBlockchain.verifyContent(contentHash);
}

export async function getBlockchainRecord(contentHash) {
  return proofPrintBlockchain.getRecord(contentHash);
}

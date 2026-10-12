import { ProofPrintService } from "../service/ProofPrintService.js";

async function main() {
  const result = await new ProofPrintService().deployRegistry();
  console.log(`ProofPrintRegistry deployed to ${result.address}`);
  console.log(`Deployment transaction: ${result.transactionHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { Contract, ContractFactory, JsonRpcProvider, isAddress, isHexString } from "ethers";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const LOCAL_RPC_URL = "http://127.0.0.1:8545";
const LOCAL_CHAIN_ID = 31337n;
const artifactUrl = new URL("../artifacts/contracts/ProofPrintRegistry.sol/ProofPrintRegistry.json", import.meta.url);
const deploymentUrl = new URL("../deployments/localhost.json", import.meta.url);

export class ProofPrintServiceError extends Error {
  constructor(message, code, options = {}) {
    super(message, options);
    this.name = "ProofPrintServiceError";
    this.code = code;
  }
}

async function loadArtifact() {
  try {
    return JSON.parse(await readFile(artifactUrl, "utf8"));
  } catch (error) {
    throw new ProofPrintServiceError(
      "ProofPrintRegistry artifact not found. Run `npm run compile` first.",
      "ARTIFACT_NOT_FOUND",
      { cause: error }
    );
  }
}

async function loadDeployment() {
  let deployment;
  try {
    deployment = JSON.parse(await readFile(deploymentUrl, "utf8"));
  } catch (error) {
    throw new ProofPrintServiceError(
      "ProofPrintRegistry is not deployed. Start the local node and run `npm run deploy:local`.",
      "DEPLOYMENT_NOT_FOUND",
      { cause: error }
    );
  }

  if (
    deployment.network !== "localhost" ||
    deployment.chainId !== LOCAL_CHAIN_ID.toString() ||
    !isAddress(deployment.address)
  ) {
    throw new ProofPrintServiceError(
      "The saved deployment is invalid or is not for the local Hardhat network. Deploy locally again.",
      "INVALID_DEPLOYMENT"
    );
  }

  return deployment;
}

function validateContentHash(contentHash) {
  if (!isHexString(contentHash, 32) || /^0x0{64}$/i.test(contentHash)) {
    throw new ProofPrintServiceError(
      "Content hash must be a non-zero, 0x-prefixed 32-byte SHA-256 digest.",
      "INVALID_CONTENT_HASH"
    );
  }
}

function getCustomErrorName(error, contractInterface) {
  const candidates = [
    error?.data,
    error?.info?.error?.data,
    error?.error?.data,
    error?.info?.error?.data?.data
  ];

  for (const data of candidates) {
    if (typeof data !== "string") {
      continue;
    }
    try {
      const parsedError = contractInterface.parseError(data);
      if (parsedError) {
        return parsedError.name;
      }
    } catch {
      // Try the next provider-specific error data location.
    }
  }

  return undefined;
}

function formatRecord(record) {
  return {
    contentHash: record.contentHash,
    registrant: record.registrant,
    timestamp: record.timestamp.toString(),
    analysisSummary: record.analysisSummary
  };
}

export class ProofPrintService {
  constructor({ rpcUrl = LOCAL_RPC_URL } = {}) {
    if (rpcUrl !== LOCAL_RPC_URL) {
      throw new ProofPrintServiceError(
        "ProofPrintService only supports the local Hardhat RPC at http://127.0.0.1:8545.",
        "UNSUPPORTED_NETWORK"
      );
    }

    this.provider = new JsonRpcProvider(LOCAL_RPC_URL);
    this.contract = undefined;
    this.artifact = undefined;
    this.deployment = undefined;
  }

  async _assertLocalNetwork() {
    try {
      const network = await this.provider.getNetwork();
      if (network.chainId !== LOCAL_CHAIN_ID) {
        throw new ProofPrintServiceError(
          `Expected local Hardhat chain ID ${LOCAL_CHAIN_ID}, received ${network.chainId}.`,
          "UNSUPPORTED_NETWORK"
        );
      }
    } catch (error) {
      if (error instanceof ProofPrintServiceError) {
        throw error;
      }
      throw new ProofPrintServiceError(
        `Unable to connect to the local Hardhat node at ${LOCAL_RPC_URL}. Start it with \`npm run node\`.`,
        "CONNECTION_FAILED",
        { cause: error }
      );
    }
  }

  async connect() {
    await this._assertLocalNetwork();
    this.artifact = await loadArtifact();
    this.deployment = await loadDeployment();

    let bytecode;
    try {
      bytecode = await this.provider.getCode(this.deployment.address);
    } catch (error) {
      throw new ProofPrintServiceError(
        `Unable to read the local Hardhat node at ${LOCAL_RPC_URL}.`,
        "CONNECTION_FAILED",
        { cause: error }
      );
    }
    if (bytecode === "0x") {
      throw new ProofPrintServiceError(
        "No contract exists at the saved address. The local node may have restarted; deploy again.",
        "CONTRACT_NOT_DEPLOYED"
      );
    }

    this.contract = new Contract(this.deployment.address, this.artifact.abi, this.provider);
    return this;
  }

  async _getContract() {
    if (!this.contract) {
      await this.connect();
    }
    return this.contract;
  }

  async deployRegistry() {
    await this._assertLocalNetwork();
    this.artifact = await loadArtifact();

    try {
      const signer = await this.provider.getSigner();
      const factory = new ContractFactory(this.artifact.abi, this.artifact.bytecode, signer);
      const registry = await factory.deploy();
      const deploymentTransaction = registry.deploymentTransaction();
      if (!deploymentTransaction) {
        throw new ProofPrintServiceError("Deployment transaction was not created.", "DEPLOYMENT_FAILED");
      }
      const receipt = await deploymentTransaction.wait();
      if (!receipt) {
        throw new ProofPrintServiceError("Deployment transaction was not mined.", "DEPLOYMENT_FAILED");
      }
      const address = await registry.getAddress();
      const block = await this.provider.getBlock(receipt.blockNumber);
      if (!block) {
        throw new ProofPrintServiceError("Unable to read the deployment block.", "DEPLOYMENT_FAILED");
      }
      const deployment = {
        network: "localhost",
        chainId: LOCAL_CHAIN_ID.toString(),
        address,
        transactionHash: receipt.hash
      };

      await mkdir(new URL("../deployments/", import.meta.url), { recursive: true });
      await writeFile(deploymentUrl, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");

      this.deployment = deployment;
      this.contract = registry;

      return {
        address,
        transactionHash: receipt.hash,
        timestamp: block.timestamp.toString()
      };
    } catch (error) {
      if (error instanceof ProofPrintServiceError) {
        throw error;
      }
      throw new ProofPrintServiceError(
        `Failed to deploy ProofPrintRegistry locally: ${error.shortMessage ?? error.message}`,
        "DEPLOYMENT_FAILED",
        { cause: error }
      );
    }
  }

  async registerContent(contentHash, analysisSummary) {
    validateContentHash(contentHash);
    if (typeof analysisSummary !== "string") {
      throw new ProofPrintServiceError("AI analysis summary must be a string.", "INVALID_ANALYSIS_SUMMARY");
    }

    const contract = await this._getContract();
    try {
      const signer = await this.provider.getSigner();
      const writableContract = contract.connect(signer);
      const transaction = await writableContract.registerContent(contentHash, analysisSummary);
      const receipt = await transaction.wait();
      const parsedEvent = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event) => event?.name === "VerificationRegistered");

      if (!parsedEvent) {
        throw new ProofPrintServiceError(
          "Registration transaction completed without a VerificationRegistered event.",
          "REGISTRATION_EVENT_MISSING"
        );
      }

      const record = formatRecord(await contract.getVerificationRecord(contentHash));
      return {
        transactionHash: receipt.hash,
        timestamp: parsedEvent.args.timestamp.toString(),
        record
      };
    } catch (error) {
      if (error instanceof ProofPrintServiceError) {
        throw error;
      }
      const errorName = getCustomErrorName(error, contract.interface);
      if (errorName === "DuplicateContentHash") {
        throw new ProofPrintServiceError("This content hash is already registered.", "DUPLICATE_REGISTRATION", {
          cause: error
        });
      }
      if (errorName === "InvalidContentHash") {
        throw new ProofPrintServiceError("The contract rejected the content hash.", "INVALID_CONTENT_HASH", {
          cause: error
        });
      }
      throw new ProofPrintServiceError(
        `Failed to register content: ${error.shortMessage ?? error.message}`,
        "CONTRACT_ERROR",
        { cause: error }
      );
    }
  }

  async getRecord(contentHash) {
    validateContentHash(contentHash);
    const contract = await this._getContract();

    try {
      return formatRecord(await contract.getVerificationRecord(contentHash));
    } catch (error) {
      const errorName = getCustomErrorName(error, contract.interface);
      if (errorName === "VerificationRecordNotFound") {
        throw new ProofPrintServiceError("No verification record exists for this content hash.", "RECORD_NOT_FOUND", {
          cause: error
        });
      }
      throw new ProofPrintServiceError(
        `Failed to retrieve verification record: ${error.shortMessage ?? error.message}`,
        "CONTRACT_ERROR",
        { cause: error }
      );
    }
  }

  async verifyContent(contentHash) {
    validateContentHash(contentHash);
    const contract = await this._getContract();

    try {
      const registered = await contract.verifyContent(contentHash);
      return {
        contentHash,
        registered,
        result: registered ? "registered" : "not_registered",
        record: registered ? await this.getRecord(contentHash) : null
      };
    } catch (error) {
      if (error instanceof ProofPrintServiceError) {
        throw error;
      }
      throw new ProofPrintServiceError(
        `Failed to verify content hash: ${error.shortMessage ?? error.message}`,
        "CONTRACT_ERROR",
        { cause: error }
      );
    }
  }
}

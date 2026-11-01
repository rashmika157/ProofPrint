# ProofPrint Blockchain

This directory contains the standalone Solidity and Hardhat project for ProofPrint. It runs against a local Ethereum network only; it does not configure public networks, private keys, or real funds.

## Requirements

- Node.js 22.10.0 or newer
- npm

Hardhat 3 requires Node.js 22.10.0 or newer. This project uses Hardhat 3's ESM configuration and network definitions; Node.js 25.9.0 was used to verify the setup.

## Install

From the repository root in PowerShell:

```powershell
cd .\blockchain
npm install
```

`npm install` creates `package-lock.json`. For later reproducible installs, use `npm ci`.

## Compile and test

```powershell
npm run compile
npm test
```

The `ProofPrintRegistry` contract registers SHA-256 digests (`bytes32`) alongside the registrant wallet, registration timestamp, and AI analysis summary. Call `registerContent(hash, summary)` to register, `verifyContent(hash)` to check existence, or `getVerificationRecord(hash)` to retrieve a record. Duplicate hashes revert with `DuplicateContentHash`; retrieving an unknown hash reverts with `VerificationRecordNotFound`. The tests cover registration and its event, duplicate rejection, record retrieval, unknown hashes, and zero-hash input.

The contract stores only the digest and summary, not uploaded content. Records and summaries are public and permanent; do not include personal, confidential, or otherwise sensitive information in an analysis summary.

## Start a local node

In one terminal, from `blockchain/`:

```powershell
npm run node
```

The local JSON-RPC endpoint is `http://127.0.0.1:8545`. Hardhat's development accounts and balances are test-only and have no real-world value.

## Local deployment entry point

With the local node running, use another terminal in `blockchain/`:

```powershell
npm run deploy:local
```

This command is explicitly pinned to the `localhost` network. It deploys `ProofPrintRegistry` to the running local node, prints the deployed address and transaction hash, and saves the local address in the ignored `deployments/localhost.json` file. The service reads the ABI from the compiled Hardhat artifact and the address from this deployment file; restart/deploy the contract again if the local node is restarted.

## JavaScript service

`service/ProofPrintService.js` exports `ProofPrintService` and `ProofPrintServiceError`. It connects only to `http://127.0.0.1:8545` and checks for local Hardhat chain ID `31337`. Its `registerContent(hash, summary)` accepts a non-zero, `0x`-prefixed 32-byte SHA-256 digest and a string summary, then returns the transaction hash, registration timestamp, and record. `verifyContent(hash)` returns `registered`, a clear `result`, and the record when registered. `getRecord(hash)` returns the record or throws a `RECORD_NOT_FOUND` service error. Invalid hashes, missing deployment/artifacts, connection failures, duplicate registrations, and other contract errors have explicit error codes.

Start the network in the first PowerShell terminal:

```powershell
cd .\blockchain
npm run node
```

In a second terminal, compile and deploy:

```powershell
cd .\blockchain
npm run compile
npm run deploy:local
```

Then run the service smoke test in that second terminal:

```powershell
npm run service:test
```

The smoke test registers a SHA-256 digest, checks the transaction hash/timestamp and retrieved record, verifies an unknown hash, and checks duplicate, missing-record, and invalid-hash handling. All test accounts and funds are local-only.

Do not add public RPC endpoints or real private keys to this local-only setup.

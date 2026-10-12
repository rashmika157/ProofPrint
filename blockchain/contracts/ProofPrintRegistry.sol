// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ProofPrintRegistry
/// @notice Registers SHA-256 content hashes with a registrant and AI analysis summary.
/// @dev Content and personal information should never be stored in the summary.
contract ProofPrintRegistry {
    struct VerificationRecord {
        bytes32 contentHash;
        address registrant;
        uint256 timestamp;
        string analysisSummary;
    }

    mapping(bytes32 => VerificationRecord) private verificationRecords;

    error InvalidContentHash();
    error DuplicateContentHash(bytes32 contentHash);
    error VerificationRecordNotFound(bytes32 contentHash);

    event VerificationRegistered(
        bytes32 indexed contentHash,
        address indexed registrant,
        uint256 timestamp
    );

    /// @notice Register a SHA-256 content hash and its non-sensitive analysis summary.
    /// @param contentHash SHA-256 digest of the content, represented as bytes32.
    /// @param analysisSummary Short, non-sensitive summary of the AI analysis.
    function registerContent(
        bytes32 contentHash,
        string calldata analysisSummary
    ) external {
        if (contentHash == bytes32(0)) {
            revert InvalidContentHash();
        }
        if (verificationRecords[contentHash].registrant != address(0)) {
            revert DuplicateContentHash(contentHash);
        }

        uint256 registeredAt = block.timestamp;
        verificationRecords[contentHash] = VerificationRecord({
            contentHash: contentHash,
            registrant: msg.sender,
            timestamp: registeredAt,
            analysisSummary: analysisSummary
        });

        emit VerificationRegistered(contentHash, msg.sender, registeredAt);
    }

    /// @notice Check whether a SHA-256 content hash has been registered.
    function verifyContent(bytes32 contentHash) external view returns (bool) {
        return verificationRecords[contentHash].registrant != address(0);
    }

    /// @notice Retrieve the record for a registered SHA-256 content hash.
    /// @dev The analysis summary is public on-chain data; do not include sensitive details.
    function getVerificationRecord(
        bytes32 contentHash
    ) external view returns (VerificationRecord memory) {
        VerificationRecord storage record = verificationRecords[contentHash];
        if (record.registrant == address(0)) {
            revert VerificationRecordNotFound(contentHash);
        }

        return record;
    }
}

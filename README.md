# ClubInvest: The Confidential Investment Club

ClubInvest is a privacy-preserving decentralized autonomous organization (DAO) that empowers members to propose and vote on investment strategies without exposing sensitive information. By utilizing Zama's Fully Homomorphic Encryption (FHE) technology, ClubInvest ensures that asset management and decision-making processes remain confidential and secure.

## The Problem

In the world of investment clubs, sharing detailed financial strategies and asset management proposals can expose members to various risks, including data breaches and malicious attempts to manipulate investment decisions. Cleartext data can lead to a loss of privacy, allowing external parties to spy on strategies, detect vulnerabilities, and potentially derail the investment goals of the club. Therefore, there is a pressing need for a secure method that protects members' proposals and assets while fostering transparent governance.

## The Zama FHE Solution

Fully Homomorphic Encryption offers the ability to perform computations on encrypted data without ever revealing the underlying information. ClubInvest employs Zama's advanced FHE technology to ensure that member proposals and votes are processed in a secure manner. Using **fhevm** to process encrypted inputs, the platform allows members to jointly manage assets while keeping their proposals confidential. This architecture removes the risk associated with exposing sensitive financial data, thereby enabling a truly private investment club experience.

## Key Features

- 🔒 **Confidential Proposals**: Submit investment strategies securely, preserving the privacy of each member's input.
- 🔄 **Encrypted Voting**: Participate in governance decisions without revealing your choices, ensuring a fair and anonymous process.
- 📊 **Homomorphic Asset Management**: Manage and analyze assets while keeping all data encrypted and secure.
- 🤝 **Collaborative DAO**: Foster a decentralized autonomous organization where every member’s voice is valued and protected.
- ⏳ **Privacy Protection**: Prevent external parties from spying on investment strategies and asset movements.

## Technical Architecture & Stack

- **Core Technology**: Zama's FHE (fhevm)
- **Smart Contract Framework**: Solidity
- **Blockchain Platform**: Ethereum
- **Development Tools**: Hardhat, Node.js
- **Languages**: Solidity, JavaScript

The architecture of ClubInvest centers around the secure processing capabilities provided by Zama's FHE technology, allowing us to build robust and privacy-focused financial applications. 

## Smart Contract / Core Logic

Here’s a simplified example of how the core logic of ClubInvest could be structured using Zama's technology:solidity
pragma solidity ^0.8.0;

import "tfhe.rs";

contract ClubInvest {
    event ProposalCreated(uint256 proposalId, bytes encryptedProposal);
    event VoteCast(uint256 proposalId, bytes encryptedVote);
    
    function createProposal(bytes memory encryptedProposal) public {
        // Store the encrypted proposal without revealing its contents
        emit ProposalCreated(proposalId, encryptedProposal);
    }

    function castVote(uint256 proposalId, bytes memory encryptedVote) public {
        // Process the encrypted vote securely with FHE
        emit VoteCast(proposalId, encryptedVote);
    }
}

## Directory Structure
/ClubInvest
├── contracts
│   └── ClubInvest.sol
├── scripts
│   └── deploy.js
├── test
│   └── ClubInvest.test.js
└── src
    └── main.js

## Installation & Setup

### Prerequisites

- Node.js (version 14 or newer)
- npm (Node Package Manager)
- Solidity Compiler
- Zama FHE library

### Installation Steps

To set up the ClubInvest project, you will need to install the necessary dependencies. Run the following commands in your terminal:

1. Install project dependencies:
   npm install
2. Install the Zama FHE library:
   npm install fhevm

## Build & Run

After installation, you can build and run the project using the following commands:

1. Compile the smart contracts:
   npx hardhat compile
2. Deploy the contracts to your local Ethereum network:
   npx hardhat run scripts/deploy.js
3. Run the main application (if applicable):
   node src/main.js

## Acknowledgements

This project would not be possible without the remarkable open-source FHE primitives provided by Zama. Their commitment to advancing privacy technology has empowered us to create a secure and confidential investment environment for all members of ClubInvest.

---

ClubInvest demonstrates the transformative power of Zama's Fully Homomorphic Encryption, promoting secure and private collaboration in the investment domain. Join the movement towards privacy-preserving finance!


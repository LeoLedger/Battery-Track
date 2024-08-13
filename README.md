# Battery supply chain lifecycle management

A blockchain based innovative traceability tool designed for the battery industry. It verifies the quality and origin of products by using blockchain technology to track every step of the production process from raw materials to distribution.

## Introduction
These smart contracts are designed to manage and track the lifecycle of produced batches in the supply chain & the actors involved in each step. All actors are assigned a unique NFT that should be generated based on their compliance and necessary checks. Similarly, each batch is represented by a unique NFT tied to the necessary on-chain data held in `BatchManager` contract.And `SupplyChain` contract coordinates the  interactions between actors and batches.


## Overview
The repo contains the following contracts:
- `AccessManager`: Responsible for guard checks on sensitive changes and regular operations performed by ERP 'company users'.
- `Actor`: Represents a unique ERC721 collection of NFT IDs for a specific type of actors. Each actor has a unique NFT ID tied to their identity.
- `Batch`: A dNFT collection where each dNFT represents a 'batch' in the supply chain. Each token is tied to the actor IDs involved in the batch and includes necessary on-chain data such as the current batch state.
- `ActorsManager`: Aggregates multiple Actor contracts, each representing a standalone collection for a specific type of actors. It manages the creation and organization of actor collections.
- `BatchManager`: Handles the validation of metadata, emission of important events, creation of batch NFTs, and linking them to the on-chain state.
- `SupplyChain`: Orchestrates the overall supply chain process, coordinating interactions between actors and batches.


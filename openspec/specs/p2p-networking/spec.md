## Purpose

Defines peer-to-peer networking for blockchain synchronization and transaction broadcasting using libp2p pubsub.

## Requirements

### Requirement: Peer discovery
The system SHALL discover peers on the local network using libp2p with MulticastDNS and establish encrypted connections via Noise protocol.

#### Scenario: Node starts and discovers peers
- **WHEN** the application starts and calls discoverPeers()
- **THEN** a libp2p node SHALL be created with TCP transport, Mplex multiplexing, Noise encryption, FloodSub pubsub, and mDNS discovery

#### Scenario: Peer joins blockchain room
- **WHEN** a new peer joins the blockchain pubsub room
- **THEN** the local node SHALL broadcast its current chain to the new peer

### Requirement: Blockchain synchronization
The system SHALL broadcast the full blockchain to peers and accept chain replacements via the blockchain pubsub channel.

#### Scenario: Broadcast chain on peer join
- **WHEN** a new peer joins the blockchain room
- **THEN** the entire blockchain SHALL be serialized and broadcast on the {ENV}-succinctcoin-BLOCKCHAIN channel

#### Scenario: Receive and process chain
- **WHEN** a blockchain message is received from a peer
- **THEN** the system SHALL parse the chain and call replaceChain() to apply consensus rules

### Requirement: Transaction broadcasting
The system SHALL broadcast new transactions to all peers via the transaction pubsub channel.

#### Scenario: Broadcast new transaction
- **WHEN** a local transaction is created
- **THEN** it SHALL be broadcast on the {ENV}-succinctcoin-TRANSACTION channel

#### Scenario: Receive transaction from peer
- **WHEN** a transaction message is received from a peer
- **THEN** the system SHALL add it to the local transaction pool

### Requirement: Channel separation
The system SHALL use separate pubsub channels for blockchain and transaction messages, prefixed by environment.

#### Scenario: Development channels
- **WHEN** running in development mode
- **THEN** channels SHALL be DEV-succinctcoin-BLOCKCHAIN and DEV-succinctcoin-TRANSACTION

#### Scenario: Production channels
- **WHEN** running in production mode
- **THEN** channels SHALL be succinctcoin-BLOCKCHAIN and succinctcoin-TRANSACTION

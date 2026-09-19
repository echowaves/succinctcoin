## Purpose

Defines peer-to-peer networking for blockchain synchronization and transaction broadcasting using libp2p pubsub with discv5-based peer discovery and circuit relay for NAT traversal.

## Requirements

### Requirement: Peer discovery via discv5 DHT
The system SHALL discover peers internet-wide using the discv5 DHT protocol with ENR (Ethereum Node Record) based identity, falling back to circuit relay when direct connections are not possible.

#### Scenario: Node starts and discovers peers via discv5
- **WHEN** the application starts and calls discoverPeers()
- **THEN** a libp2p node SHALL be created with TCP transport, circuit relay, mplex multiplexing, Noise encryption, and discv5 peer discovery connected to bootstrap nodes

#### Scenario: Node discovers peers via DHT search
- **WHEN** discv5 peer discovery is active
- **THEN** the node SHALL search the DHT for ENRs using the configured search interval (default: 30 seconds)
- **AND** discovered peers SHALL be added to the libp2p peer store

#### Scenario: Graceful degradation when bootstrap is unreachable
- **WHEN** bootstrap nodes are unreachable or DISCV5_BOOTSTRAP_ENRs is empty
- **THEN** discv5 discovery SHALL be disabled and the node SHALL continue operating with relay-only connections
- **AND** the node SHALL log a warning message indicating relay mode

### Requirement: Circuit relay connectivity
The system SHALL connect to circuit relay servers when direct peer connections are not possible due to NAT or firewall restrictions.

#### Scenario: Connect via circuit relay
- **WHEN** the node has configured RELAY_ENDPOINTS
- **THEN** it SHALL establish relay transport and reserve a relay connection
- **AND** the relay endpoint SHALL be advertised in the node's ENR

#### Scenario: DCUtR direct connection upgrade
- **WHEN** two nodes behind NAT want to connect and both have relay connections
- **THEN** the node SHALL initiate DCUtR (Direct Connection under NAT) upgrade
- **AND** if successful, the relay connection SHALL be replaced with a direct TCP connection

#### Scenario: UPnP port mapping
- **WHEN** the node starts and UPnP is supported by the router
- **THEN** the node SHALL attempt to map ports for incoming connections
- **AND** failed UPnP attempts SHALL be logged but not cause failure

### Requirement: Blockchain synchronization
The system SHALL broadcast the full blockchain to peers and accept chain replacements via the blockchain pubsub channel.

#### Scenario: Broadcast chain on peer join
- **WHEN** a new peer joins the blockchain room
- **THEN** the entire blockchain SHALL be serialized and broadcast on the {ENV}-succinctcoin-BLOCKCHAIN channel

#### Scenario: Receive and process chain
- **WHEN** a blockchain message is received from a peer
- **THEN** the system SHALL parse the chain in a try/catch and call replaceChain() to apply consensus rules

#### Scenario: Malformed blockchain ignored
- **WHEN** a malformed or unparsable blockchain message is received from a peer
- **THEN** the system SHALL catch the parse error, log the failure, and continue operating

### Requirement: Transaction broadcasting
The system SHALL broadcast new transactions to all peers via the transaction pubsub channel, and handle peer-received transactions including duplicate-sender dedup and malformed-message handling.

#### Scenario: Broadcast new transaction
- **WHEN** a local transaction is created
- **THEN** it SHALL be broadcast on the {ENV}-succinctcoin-TRANSACTION channel

#### Scenario: Receive transaction from peer
- **WHEN** a transaction message is received from a peer
- **THEN** the system SHALL add it to the local transaction pool

#### Scenario: Duplicate transaction ignored
- **WHEN** a transaction already known to the pool is received from a peer
- **THEN** the system SHALL deduplicate and not add the same transaction twice

#### Scenario: Malformed transaction ignored
- **WHEN** a malformed or invalid transaction message is received from a peer
- **THEN** the system SHALL catch the error, log it, and continue operating without adding it to the pool

### Requirement: Chain-sync precedence
The system SHALL enforce correct precedence when receiving an incoming chain so that an empty local chain is initialized from the root before any peer replacement can occur.

#### Scenario: Root sync initializes empty local chain
- **WHEN** running in development mode with an empty local chain and ROOT_NODE_ADDRESS is set
- **THEN** the node SHALL treat the received chain as the authoritative root and initialize the local chain from it before applying any peer replaceChain()

#### Scenario: Peer replaceChain does not overwrite root on empty chain
- **WHEN** the local chain is empty and a peer attempts replaceChain()
- **THEN** the peer chain SHALL NOT be accepted directly; the node SHALL first sync the authoritative root before applying replacement

### Requirement: Channel separation
The system SHALL use separate pubsub channels for blockchain and transaction messages, prefixed by environment.

#### Scenario: Development channels
- **WHEN** running in development mode
- **THEN** channels SHALL be DEV-succinctcoin-BLOCKCHAIN and DEV-succinctcoin-TRANSACTION

#### Scenario: Production channels
- **WHEN** running in production mode
- **THEN** channels SHALL be succinctcoin-BLOCKCHAIN and succinctcoin-TRANSACTION

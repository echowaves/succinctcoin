## MODIFIED Requirements

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

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Chain-sync precedence
The system SHALL enforce correct precedence when receiving an incoming chain so that an empty local chain is initialized from the root before any peer replacement can occur.

#### Scenario: Root sync initializes empty local chain
- **WHEN** running in development mode with an empty local chain and ROOT_NODE_ADDRESS is set
- **THEN** the node SHALL treat the received chain as the authoritative root and initialize the local chain from it before applying any peer replaceChain()

#### Scenario: Peer replaceChain does not overwrite root on empty chain
- **WHEN** the local chain is empty and a peer attempts replaceChain()
- **THEN** the peer chain SHALL NOT be accepted directly; the node SHALL first sync the authoritative root before applying replacement

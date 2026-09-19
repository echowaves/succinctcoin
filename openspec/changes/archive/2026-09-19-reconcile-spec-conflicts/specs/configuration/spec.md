## MODIFIED Requirements

### Requirement: Genesis block data
The system SHALL define immutable genesis block data with fixed values, and be the single canonical genesis definition that all other specs treat as authoritative and cross-reference here rather than restating the values.

#### Scenario: Genesis block fields
- **WHEN** the genesis data is accessed
- **THEN** it SHALL contain: height=0, uuid="GENESIS", timestamp=0, validator="GENESIS", lastHash="GENESIS", hash="GENESIS", data=["GENESIS"], signature="GENESIS"

#### Scenario: Genesis cross-reference
- **WHEN** a requirement references genesis block constants
- **THEN** it SHALL reference the definition in configuration/spec.md rather than restating the values

## ADDED Requirements

### Requirement: P2P discovery configuration
The system SHALL define the P2P environment variables referenced across specs, with defaults that allow a solo dev node to run without any external peers.

#### Scenario: discv5 bootstrap ENRs default to empty
- **WHEN** DISCV5_BOOTSTRAP_ENRs is unset or empty
- **THEN** the node SHALL start with discv5 discovery disabled and fall back to circuit relay only

#### Scenario: relay endpoints default to empty
- **WHEN** RELAY_ENDPOINTS is unset or empty
- **THEN** the node SHALL start without any configured circuit-relay transports and log a dev-mode warning

#### Scenario: discv5 search interval default
- **WHEN** the configured discv5 search interval is unset
- **THEN** it SHALL default to 30 seconds

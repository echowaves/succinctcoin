## MODIFIED Requirements

### Requirement: Native fetch available
The system SHALL use native `fetch` instead of `electron-fetch`.

#### Scenario: Main process uses native fetch
- **WHEN** the main process code runs (Electron 42)
- **THEN** `fetch` SHALL be available globally without importing `electron-fetch`

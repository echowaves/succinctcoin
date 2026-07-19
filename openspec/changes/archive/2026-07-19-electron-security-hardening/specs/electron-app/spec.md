## MODIFIED Requirements

### Requirement: Electron window management
The system SHALL create a BrowserWindow loading the webpack-bundled renderer and manage the application lifecycle. The BrowserWindow MUST use secure webPreferences: `nodeIntegration` SHALL be `false`, `contextIsolation` SHALL be `true`, and `webSecurity` SHALL be `true`. The renderer process MUST NOT have direct access to Node.js APIs and SHALL communicate with the main process exclusively through the `contextBridge` exposed in the preload script.

#### Scenario: App ready creates window
- **WHEN** the Electron app emits the 'ready' event
- **THEN** a BrowserWindow SHALL be created loading the main_window webpack entry

#### Scenario: Secure webPreferences
- **WHEN** the BrowserWindow is created
- **THEN** `webPreferences.nodeIntegration` SHALL be `false`
- **THEN** `webPreferences.contextIsolation` SHALL be `true`
- **THEN** `webPreferences.webSecurity` SHALL be `true`

#### Scenario: Renderer cannot access Node.js APIs
- **WHEN** renderer code attempts to call `require()` from a component
- **THEN** the call SHALL fail because `require` is not available in the renderer context

#### Scenario: Renderer communicates via preload bridge
- **WHEN** renderer needs data from the main process
- **THEN** it SHALL use `window.electronAPI` methods exposed by the preload script through `contextBridge`

#### Scenario: All windows closed quits app (non-macOS)
- **WHEN** all windows are closed on Windows/Linux
- **THEN** the application SHALL quit

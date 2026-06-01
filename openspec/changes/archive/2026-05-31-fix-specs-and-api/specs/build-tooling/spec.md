## MODIFIED Requirements

### Requirement: Electron version
The system SHALL run on Electron 42.x or later.

#### Scenario: Electron version is 42.x
- **WHEN** the package.json is read
- **THEN** the `electron` dependency SHALL be set to version `42.x` or higher

### Requirement: Electron Forge version
The system SHALL use Electron Forge 7.x stable (not beta).

#### Scenario: Forge CLI is stable
- **WHEN** the package.json is read
- **THEN** `@electron-forge/cli` SHALL be version `7.x` or higher (not a beta version)

#### Scenario: Forge makers are stable
- **WHEN** the package.json is read
- **THEN** all `@electron-forge/maker-*` packages SHALL be version `7.x` or higher

#### Scenario: Forge plugin-webpack is stable
- **WHEN** the package.json is read
- **THEN** `@electron-forge/plugin-webpack` SHALL be version `7.x` or higher

### Requirement: Babel version
The system SHALL use Babel 7.26.x or later for transpilation.

#### Scenario: Babel core is updated
- **WHEN** the package.json is read
- **THEN** `@babel/core` SHALL be version `7.26.x` or higher

#### Scenario: Babel presets are updated
- **WHEN** the package.json is read
- **THEN** `@babel/preset-env` and `@babel/preset-react` SHALL be version `7.26.x` or higher

#### Scenario: Class properties plugin not needed
- **WHEN** the package.json is read
- **THEN** `@babel/plugin-proposal-class-properties` SHALL NOT be listed as a dependency (built into Babel 7.x)

### Requirement: ESLint flat config
The system SHALL use ESLint 9.x with flat config format (`eslint.config.js`).

#### Scenario: ESLint version is 9.x
- **WHEN** the package.json is read
- **THEN** `eslint` SHALL be version `9.x` or higher

#### Scenario: Flat config file exists
- **WHEN** the project root is listed
- **THEN** `eslint.config.js` SHALL exist

#### Scenario: Legacy eslintrc removed
- **WHEN** the project root is listed
- **THEN** `bk.eslintrc` SHALL NOT exist (backup file removed)

#### Scenario: @eslint/js used instead of airbnb
- **WHEN** eslint.config.js is read
- **THEN** it SHALL use `@eslint/js` instead of `eslint-config-airbnb`

### Requirement: Jest version
The system SHALL use Jest 30.x for testing.

#### Scenario: Jest version is 30.x
- **WHEN** the package.json is read
- **THEN** `jest` SHALL be version `30.x`

#### Scenario: Tests pass
- **WHEN** `npm test` is executed
- **THEN** all existing tests SHALL pass

### Requirement: Webpack plugins
The system SHALL use compatible versions of webpack plugins.

#### Scenario: Webpack version is 5.x
- **WHEN** the package.json is read
- **THEN** `webpack` SHALL be version `5.x` or higher

#### Scenario: Webpack CLI is compatible
- **WHEN** the package.json is read
- **THEN** `webpack-cli` SHALL be a version compatible with webpack 5.x

### Requirement: React version
The system SHALL use React 19.x for the renderer UI.

#### Scenario: React version is 19.x
- **WHEN** the package.json is read
- **THEN** `react` and `react-dom` SHALL be version `19.x` or higher

### Requirement: libp2p version
The system SHALL use libp2p 3.x for peer-to-peer networking.

#### Scenario: libp2p version is 3.x
- **WHEN** the package.json is read
- **THEN** `libp2p` SHALL be version `3.x` or higher

#### Scenario: libp2p modules are compatible
- **WHEN** the package.json is read
- **THEN** all `@libp2p/*` packages SHALL be versions compatible with libp2p 3.x

### Requirement: Dependency version format
The system SHALL use exact versions in package.json (no `^` or `~` prefixes).

#### Scenario: Dependencies use exact versions
- **WHEN** the package.json is read
- **THEN** dependency versions SHALL NOT contain `^` or `~` prefixes

## Purpose

Defines the build tooling, dependency versions, and configuration for the SuccinctCoin Electron application.

## Requirements

### Requirement: Electron version
The system SHALL run on Electron 28.x LTS or later.

#### Scenario: Electron version is 28.x
- **WHEN** the package.json is read
- **THEN** the `electron` dependency SHALL be set to version `28.x` or higher

#### Scenario: Electron app launches
- **WHEN** `npm start` is executed
- **THEN** the Electron app SHALL launch without errors

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

#### Scenario: copy-webpack-plugin is v12+
- **WHEN** the package.json is read
- **THEN** `copy-webpack-plugin` SHALL be version `12.x` or higher

#### Scenario: css-loader is v7+
- **WHEN** the package.json is read
- **THEN** `css-loader` SHALL be version `7.x` or higher

#### Scenario: style-loader is v4+
- **WHEN** the package.json is read
- **THEN** `style-loader` SHALL be version `4.x` or higher

#### Scenario: babel-loader is v9+
- **WHEN** the package.json is read
- **THEN** `babel-loader` SHALL be version `9.x` or higher

### Requirement: Removed dependencies
The system SHALL NOT depend on packages that are no longer needed.

#### Scenario: electron-fetch removed
- **WHEN** the package.json is read
- **THEN** `electron-fetch` SHALL NOT be listed as a dependency

#### Scenario: body-parser removed
- **WHEN** the package.json is read
- **THEN** `body-parser` SHALL NOT be listed as a dependency

#### Scenario: @vercel/webpack-asset-relocator-loader removed
- **WHEN** the package.json is read
- **THEN** `@vercel/webpack-asset-relocator-loader` SHALL NOT be listed as a dependency

### Requirement: Native fetch available
The system SHALL use native `fetch` instead of `electron-fetch`.

#### Scenario: Main process uses native fetch
- **WHEN** the main process code runs (Electron 28)
- **THEN** `fetch` SHALL be available globally without importing `electron-fetch`

### Requirement: Express body-parser not needed
The system SHALL use built-in Express body parsing.

#### Scenario: Express uses built-in JSON parser
- **WHEN** the Express API is configured
- **THEN** `express.json()` SHALL be used instead of `bodyParser.json()`

### Requirement: Preload uses contextBridge
The system SHALL use the secure `contextBridge` pattern in the preload script.

#### Scenario: preload.js uses contextBridge
- **WHEN** the preload script is read
- **THEN** it SHALL use `contextBridge.exposeInMainWorld` instead of directly assigning to `window`

### Requirement: electron-is-dev migration
The system SHALL use `app.isPackaged` instead of `electron-is-dev`.

#### Scenario: Main process uses app.isPackaged
- **WHEN** the main process code is read
- **THEN** it SHALL use `app.isPackaged` from the `electron` module instead of `electron-is-dev`

### Requirement: React testing library updated
The system SHALL use a compatible version of React Testing Library.

#### Scenario: @testing-library/react is updated
- **WHEN** the package.json is read
- **THEN** `@testing-library/react` SHALL be version `16.x` or higher

### Requirement: Bootstrap and React Bootstrap updated
The system SHALL use compatible versions of Bootstrap and React Bootstrap.

#### Scenario: Bootstrap is 5.3.x
- **WHEN** the package.json is read
- **THEN** `bootstrap` SHALL be version `5.3.x`

#### Scenario: React Bootstrap is 2.x latest
- **WHEN** the package.json is read
- **THEN** `react-bootstrap` SHALL be version `2.x` (latest compatible)

### Requirement: React Router updated
The system SHALL use the latest compatible version of React Router 6.

#### Scenario: react-router-dom is 6.x latest
- **WHEN** the package.json is read
- **THEN** `react-router-dom` SHALL be version `6.x` (latest compatible)

### Requirement: Concurrently updated
The system SHALL use the latest version of concurrently.

#### Scenario: concurrently is latest
- **WHEN** the package.json is read
- **THEN** `concurrently` SHALL be the latest version

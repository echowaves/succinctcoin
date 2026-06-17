# Phase 7: Electron 42 Upgrade

## Why

The project is running on Electron 36.9.5. Upgrading to Electron 42 provides:

- **Security**: Latest security patches and Chromium 138
- **Performance**: Improved V8 engine, better memory management
- **Features**: Modern web platform APIs, better Node.js 24 support
- **Long-term support**: Electron 42 is the current LTS version

## What Changes

### Dependencies Updated

| Package | Current | Target |
|---------|---------|--------|
| `electron` | 36.9.5 | 42.3.0 |
| `electron-is-dev` | 2.0.0 | 3.0.1 |
| `electron-squirrel-startup` | 1.0.0 | 1.0.1 |
| `@electron-forge/*` | 7.4.0 | 7.5.x (latest) |

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Update electron version |
| `src/main/index.js` | Verify Electron API compatibility |
| `webpack.main.config.js` | Check for compatibility issues |
| `webpack.renderer.config.js` | Check for compatibility issues |

### Electron 36 → 42 Breaking Changes

Key changes to research and address:
- Node.js version bump (20 → 24)
- Deprecated API removals
- Security improvements
- Web preferences changes

## Scope

**In scope**:
- Upgrade Electron from 36 to 42
- Update @electron-forge to latest 7.x
- Verify all Electron APIs still work
- Test app launch and packaging

**Out of scope**:
- React Router 7 migration (separate phase)
- Express 5 upgrade (separate phase)
- New features or functionality

## Success Criteria

1. `npm install` completes without errors
2. `npm test` passes (same results as Phase 6)
3. `npm start` launches the app correctly
4. All Electron APIs work as expected
5. App can be packaged successfully

## Risks

- Electron 42 may have breaking changes in APIs
- Node.js 24 may have compatibility issues with some packages
- Webpack config may need updates for new Electron version
- Native modules may need recompilation

## Migration Steps

1. Research Electron 42 migration guide
2. Update package.json with new Electron version
3. Run `npm install` and resolve any dependency conflicts
4. Test app launch with `npm start`
5. Verify all Electron APIs work correctly
6. Test app packaging with `npm run package`

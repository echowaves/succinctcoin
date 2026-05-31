# Phase 6: Electron 36 Upgrade

## Why

The project is running on Electron 28.2.0 (from 2024). Upgrading to Electron 36 provides:

- **Security**: Latest security patches and improvements
- **Chromium 128**: Modern web platform features, better performance
- **Node.js 20**: LTS with better performance, new features
- **Long-term support**: Electron 36 is the current LTS version
- **Compatibility**: Better compatibility with latest npm packages

## What Changes

### Dependencies Updated

| Package | Current | Target |
|---------|---------|--------|
| `electron` | 28.2.0 | 36.9.5 |
| `@electron-forge/*` | 7.4.0 | 7.5.x (latest) |

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Update electron version |
| `webpack.main.config.js` | Check for compatibility issues |
| `webpack.renderer.config.js` | Check for compatibility issues |
| `src/main/index.js` | Verify Electron API compatibility |

### Electron 28 → 36 Breaking Changes

Key changes to research and address:
- Node.js version bump (20 → 22)
- Deprecated API removals
- Security improvements
- Web preferences changes

## Scope

**In scope**:
- Upgrade Electron from 28 to 36
- Update @electron-forge to latest 7.x
- Verify all Electron APIs still work
- Test app launch and packaging

**Out of scope**:
- nodeIntegration: false (Phase 7)
- TypeScript migration (separate phase)
- New features or functionality

## Success Criteria

1. `npm install` completes without errors
2. `npm test` passes (same results as Phase 5)
3. `npm start` launches the app correctly
4. All Electron APIs work as expected
5. App can be packaged successfully

## Risks

- Electron 36 may have breaking changes in APIs — review migration guide
- Webpack config may need updates for new Electron version
- Native modules may need recompilation
- Some Electron APIs may be deprecated or removed

## Migration Steps

1. Research Electron 36 migration guide
2. Update package.json with new Electron version
3. Run `npm install` and resolve any dependency conflicts
4. Update @electron-forge to latest 7.x
5. Test app launch with `npm start`
6. Verify all Electron APIs work correctly
7. Test app packaging with `npm run package`

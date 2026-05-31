# Phase 3: P2P Networking Upgrade

## Why

The P2P networking layer is running on libp2p ^1.4.0 (from 2022) with outdated dependencies. This creates:

- **Security risk**: libp2p 1.x has known vulnerabilities patched in later versions
- **API changes**: libp2p 3.x has significant API changes that need to be addressed
- **Dependency rot**: @libp2p/tcp ^3.0.2, @chainsafe/libp2p-noise ^15.0.0 are outdated
- **Maintenance burden**: Outdated p2p dependencies with no security patches

## What Changes

### Dependencies Updated

| Package | Current | Target |
|---------|---------|--------|
| `libp2p` | ^1.4.0 | ^3.3.2 |
| `@libp2p/tcp` | ^3.0.2 | ^11.0.20 |
| `@chainsafe/libp2p-noise` | ^15.0.0 | ^17.0.0 |
| `ipfs-pubsub-room` | (implicit) | ^3.0.0 |

### Files Modified

| File | Changes |
|------|---------|
| `src/main/app/pubsub.js` | Update to libp2p 3.x API, modernize node creation |
| `src/main/app/transaction-miner.js` | Update if API changes affect it |
| `package.json` | Update dependency versions |

### libp2p 1.x → 3.x API Changes

Key changes to research and address:
- Node creation API changes (createLibp2p signature)
- Transport configuration changes
- PubSub API changes
- Peer discovery changes

## Scope

**In scope**:
- Upgrade libp2p and all related dependencies
- Update pubsub.js to use new libp2p 3.x API
- Update transaction-miner.js if needed
- Test P2P functionality

**Out of scope**:
- React 19 upgrade (Phase 4)
- contextIsolation: true (Phase 4)
- New P2P features or protocol changes

## Success Criteria

1. `npm install` completes without errors
2. `npm test` passes (same results as Phase 2)
3. `npm run lint` passes with no errors
4. `npm start` launches the app without P2P errors
5. P2P peer discovery and messaging works correctly

## Risks

- libp2p 3.x API may have breaking changes — review migration guide carefully
- ipfs-pubsub-room may not be compatible with libp2p 3.x — may need alternative
- Peer discovery may not work in new environment — test mDNS functionality
- PubSub channels may have different API — update message handling if needed

## Migration Steps

1. Research libp2p 3.x migration guide
2. Update package.json with new dependency versions
3. Run `npm install` and resolve any dependency conflicts
4. Update pubsub.js to use new libp2p 3.x API
5. Test P2P functionality with multiple nodes
6. Update transaction-miner.js if API changes affect it

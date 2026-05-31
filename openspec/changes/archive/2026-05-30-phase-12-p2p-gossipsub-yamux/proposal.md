# Phase 12: P2P Networking — Gossipsub & Yamux Migration

## Why

The P2P layer is still using deprecated/legacy libp2p modules:

- **`@libp2p/floodsub`** — marked as "academic purposes only" in its own README. The libp2p project explicitly recommends `@libp2p/gossipsub` as the production-grade replacement. Floodsub floods the entire network with every message — no topic mesh, no message optimization.
- **`@libp2p/mplex`** — superseded by `@chainsafe/libp2p-yamux`. Yamux provides better backpressure, multiplexing, and is the recommended muxer for libp2p 3.x+.
- **`ipfs-pubsub-room`** — a convenience wrapper around pubsub that provided room/topic abstraction with `peer joined`/`peer left` events. This wrapper is no longer maintained and is incompatible with the gossipsub API surface.

These dependencies create:
- **Security risk**: floodsub has known inefficiencies that make the network vulnerable to DoS (every message propagated to every peer regardless of interest)
- **Performance**: floodsub's fan-out means O(n) message duplication per peer; gossipsub's mesh topology reduces this to O(mesh-size)
- **Maintenance**: these packages are in maintenance mode with no active development

## What Changes

### Dependencies Updated

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| `@libp2p/floodsub` | `^11.0.22` | **REMOVED** | Replaced by `@libp2p/gossipsub` |
| `@libp2p/mplex` | `^12.0.23` | **REMOVED** | Replaced by `@chainsafe/libp2p-yamux` |
| `ipfs-pubsub-room` | `^3.0.0` | **REMOVED** | Replaced by direct gossipsub API |
| `@libp2p/gossipsub` | (none) | `^15.0.15` | Production-grade pubsub protocol |
| `@chainsafe/libp2p-yamux` | (none) | `^4.0.6` | Recommended stream muxer |

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Remove floodsub, mplex, ipfs-pubsub-room. Add gossipsub, yamux. |
| `src/main/app/pubsub.js` | Replace floodsub → gossipsub, mplex → yamux, ipfs-pubsub-room → direct pubsub API |

### API Migration: ipfs-pubsub-room → gossipsub

```
Current (ipfs-pubsub-room):
┌──────────────────────────────────────────────────────────────┐
│  const room = new Room(node, topic)                          │
│                                                              │
│  room.on('message', message => {                             │
│    const data = JSON.parse(message.data.toString('utf8'))    │
│  })                                                          │
│                                                              │
│  room.on('peer joined', peer => { ... })                    │
│  room.on('peer left', peer => { ... })                       │
│                                                              │
│  room.broadcast(JSON.stringify(data))                        │
└──────────────────────────────────────────────────────────────┘

Target (gossipsub):
┌──────────────────────────────────────────────────────────────┐
│  // Subscribe to topic                                       │
│  await node.pubsub.subscribe(topic)                          │
│                                                              │
│  node.pubsub.addEventListener('message', event => {          │
│    const data = JSON.parse(new TextDecoder().decode(         │
│      event.detail.data))                                     │
│  })                                                          │
│                                                              │
│  // Track peers via getPeers(topic)                          │
│  const peers = node.pubsub.getPeers(topic)  // PeerId[]      │
│                                                              │
│  await node.pubsub.publish(topic, new TextEncoder().encode(  │
│    JSON.stringify(data)))                                    │
└──────────────────────────────────────────────────────────────┘
```

Key API differences:
- **`subscribe(topic)`** — returns a `Subscription` object; called once per topic
- **`publish(topic, data)`** — publishes `Uint8Array` data (not strings); returns `PublishResult` with `recipients: PeerId[]`
- **`addEventListener('message', handler)`** — replaces `room.on('message', ...)`; event detail contains `peerId`, `topic`, `data` (all `Uint8Array`)
- **`getPeers(topic)`** — replaces `peer joined`/`peer left` tracking; returns current `PeerId[]` for a topic
- **`TextEncoder`/`TextDecoder`** — required for string ↔ `Uint8Array` conversion (gossipsub works with raw bytes)

### Stream Muxer Migration

```
Current:  streamMuxers: [mplex()]
Target:   streamMuxers: [yamux()]
```

Both are drop-in replacements — same interface, different implementation. Yamux provides better flow control and is the recommended muxer.

## Scope

**In scope**:
- Replace `@libp2p/floodsub` with `@libp2p/gossipsub`
- Replace `@libp2p/mplex` with `@chainsafe/libp2p-yamux`
- Replace `ipfs-pubsub-room` with direct gossipsub API
- Update `src/main/app/pubsub.js` with new API calls
- Update `package.json` dependencies
- Ensure app still launches without errors

**Out of scope**:
- VPS bootstrap node setup (Phase 11)
- Relay server deployment (Phase 11)
- Cross-network testing (Phase 11)
- New P2P features or protocol changes
- React 19 or other renderer changes

## Success Criteria

1. `npm install` completes without errors or peer dependency conflicts
2. `npm test` passes (same results as current: 118/118 tests pass)
3. `npm run lint` passes with no new errors
4. `npm start` launches the app without P2P errors
5. `pubsub.js` uses gossipsub for pubsub (not floodsub)
6. `pubsub.js` uses yamux for stream muxing (not mplex)
7. No `ipfs-pubsub-room` imports remain in source code
8. Block and transaction broadcast still works (same message format, different transport)

## Risks

| Risk | Mitigation |
|------|-----------|
| gossipsub message format differs from floodsub | Both use the same `publish(topic, data)` API; data is `Uint8Array` in both. Message handler uses `TextDecoder` instead of `message.data.toString('utf8')` — equivalent behavior. |
| `getPeers()` replaces `peer joined`/`peer left` events | We'll track peer state by comparing `getPeers()` results periodically, or use the `peersChanged` event if available. For broadcast-on-join, we can check `getPeers().length > 0` in the message handler as a fallback. |
| gossipsub may not be compatible with floodsub peers | gossipsub is explicitly compatible with floodsub for interop. Nodes on gossipsub can receive messages from floodsub nodes (one-way). |
| yamux may have different performance characteristics | Yamux is the recommended muxer and is used by the majority of libp2p nodes. Drop-in replacement. |
| `TextEncoder`/`TextDecoder` not available in Electron main process | These are standard Web APIs available in Node.js 11+ and Electron 42. No polyfill needed. |

## Migration Plan

```
Phase 12.1: Dependency swap
  ├── Remove floodsub, mplex, ipfs-pubsub-room from package.json
  ├── Add gossipsub (^15.0.15), yamux (^4.0.6) to package.json
  └── npm install

Phase 12.2: pubsub.js rewrite
  ├── Replace imports (floodsub → gossipsub, mplex → yamux, remove ipfs-pubsub-room)
  ├── Replace room creation with subscribe() calls
  ├── Replace room.on('message') with addEventListener('message')
  ├── Replace room.on('peer joined/left') with getPeers() tracking
  ├── Replace room.broadcast() with pubsub.publish()
  └── Add TextEncoder/TextDecoder for string ↔ Uint8Array conversion

Phase 12.3: Validation
  ├── npm test — verify no regressions
  ├── npm run lint — verify no new lint errors
  ├── npm start — verify app launches
  └── Verify pubsub module loads without errors
```

## Rollback Plan

1. `git checkout -- package.json` — revert dependency changes
2. `git checkout -- src/main/app/pubsub.js` — revert pubsub changes
3. `rm -rf node_modules && npm install` — restore original deps
4. Repeat step 2

The git history provides a clean rollback path. No data format changes — message payloads remain JSON strings, just transported differently.

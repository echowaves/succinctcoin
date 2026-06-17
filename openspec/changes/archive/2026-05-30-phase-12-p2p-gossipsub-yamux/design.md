# Design: Phase 12 — Gossipsub & Yamux Migration

## Overview

This change migrates the P2P networking layer from legacy libp2p modules (floodsub, mplex, ipfs-pubsub-room) to their modern replacements (gossipsub, yamux) with a direct pubsub API.

## Architecture

### Current State

```
┌─────────────────────────────────────────────────────────────┐
│  PubSub class (pubsub.js)                                    │
│                                                              │
│  createLibp2p({                                             │
│    transports: [tcp(), relay()],                             │
│    streamMuxers: [mplex()],                                  │
│    connectionEncrypters: [noise()],                          │
│    pubsub: floodsub(),                                       │
│    peerDiscovery: [discv5],                                  │
│    services: { autoNAT, dcutr, upnpNat }                    │
│  })                                                          │
│                                                              │
│  blockChainRoom = new Room(node, topic)  ← ipfs-pubsub-room │
│  transactionRoom = new Room(node, topic)                    │
│                                                              │
│  room.on('message', handler)        ← room event system     │
│  room.on('peer joined', handler)                       │
│  room.on('peer left', handler)                         │
│  room.broadcast(data)                        ← room method   │
└─────────────────────────────────────────────────────────────┘
```

### Target State

```
┌─────────────────────────────────────────────────────────────┐
│  PubSub class (pubsub.js)                                    │
│                                                              │
│  createLibp2p({                                             │
│    transports: [tcp(), relay()],                             │
│    streamMuxers: [yamux()],              ← yamux replaces    │
│    connectionEncrypters: [noise()],                          │
│    pubsub: gossipsub(),                ← gossipsub replaces   │
│    peerDiscovery: [discv5],                                  │
│    services: { autoNAT, dcutr, upnpNat }                    │
│  })                                                          │
│                                                              │
│  await node.pubsub.subscribe(BLOCKCHAIN_TOPIC)  ← direct     │
│  await node.pubsub.subscribe(TRANSACTION_TOPIC) ← direct     │
│                                                              │
│  node.pubsub.addEventListener('message', handler) ← event    │
│  node.pubsub.getPeers(topic)            ← peer tracking      │
│  await node.pubsub.publish(topic, data)   ← publish         │
└─────────────────────────────────────────────────────────────┘
```

## Design Decisions

### Decision 1: Use gossipsub directly, not a wrapper

**Choice**: Direct `node.pubsub` API instead of a room/topic wrapper.

**Rationale**:
- `ipfs-pubsub-room` is a thin wrapper that adds `peer joined`/`peer left` events and a `broadcast()` method
- No equivalent wrapper exists for gossipsub in the libp2p ecosystem
- Direct API is simpler, more transparent, and easier to debug
- The wrapper added complexity (Room instances, event mapping) without significant benefit

**Tradeoff**: We lose the convenient `peer joined`/`peer left` events. We'll replace this with `getPeers()` calls or the `peersChanged` event.

### Decision 2: Track peers via getPeers() with change detection

**Choice**: Periodically compare `getPeers(topic)` results to detect peer joins/leaves.

**Rationale**:
- gossipsub doesn't emit `peer joined`/`peer left` events
- `getPeers(topic)` returns the current `PeerId[]` for a topic
- We can track the previous peer list and diff it to detect changes
- Simpler than implementing a full peer tracker

**Implementation**:
```js
let previousPeers = new Set()

// In message handler or periodic check:
const currentPeers = node.pubsub.getPeers(topic)
const currentSet = new Set(currentPeers.map(p => p.toString()))

const newPeers = currentPeers.filter(p => !previousPeers.has(p.toString()))
const leftPeers = [...previousPeers].filter(p => !currentSet.has(p))

if (newPeers.length > 0) {
  // handle peer joins
}
previousPeers = currentSet
```

Alternatively, if `peersChanged` event is available on the subscription object, use that instead.

### Decision 3: TextEncoder/TextDecoder for string ↔ Uint8Array

**Choice**: Use Web APIs for encoding/decoding.

**Rationale**:
- gossipsub's `publish()` takes `Uint8Array`
- gossipsub's `message` event provides `data: Uint8Array`
- `TextEncoder`/`TextDecoder` are available in Node.js 11+ and Electron 42
- No need for Buffer conversion (though Buffer extends Uint8Array, so `Buffer.from(str)` would also work)

```js
// Publish: string → Uint8Array
await node.pubsub.publish(topic, new TextEncoder().encode(JSON.stringify(data)))

// Receive: Uint8Array → string
const data = JSON.parse(new TextDecoder().decode(event.detail.data))
```

### Decision 4: Keep message format unchanged

**Choice**: Continue using JSON string serialization for messages.

**Rationale**:
- Both floodsub and gossipsub transport raw `Uint8Array` bytes
- The application-level format (JSON) is independent of the transport
- No need to change message structure — just the transport layer
- Existing peers (if any) would need to adopt gossipsub too, but since the bootstrap node isn't deployed yet, this is a clean break

### Decision 5: Yamux as drop-in replacement for mplex

**Choice**: Replace `mplex()` with `yamux()` directly.

**Rationale**:
- Both implement the libp2p stream multiplexing interface
- Yamux is the recommended muxer in libp2p 3.x+
- Drop-in replacement — same constructor signature, no config changes needed
- Yamux has better flow control (window-based backpressure)

## File Changes

### src/main/app/pubsub.js

**Before** (key sections):
```js
import Room from 'ipfs-pubsub-room'
import { mplex } from '@libp2p/mplex'
import { floodsub } from '@libp2p/floodsub'

const node = await createLibp2p({
  transports: [tcp(), relay()],
  streamMuxers: [mplex()],
  pubsub: floodsub(),
  // ...
})

this.blockChainRoom = new Room(node, globalConfig.CHANNELS.BLOCKCHAIN)
this.transactionRoom = new Room(node, globalConfig.CHANNELS.TRANSACTION)

this.blockChainRoom.on('message', async message => {
  const parsedMessage = JSON.parse(message.data.toString('utf8'))
  await this.blockchain.replaceChain(parsedMessage, true, () => { ... })
})

this.blockChainRoom.on('peer joined', peer => {
  this.broadcastChain()
})

broadcastChain() {
  this.blockChainRoom.broadcast(JSON.stringify(this.blockchain.chain))
}
```

**After** (key sections):
```js
import { gossipsub } from '@libp2p/gossipsub'
import { yamux } from '@chainsafe/libp2p-yamux'

const BLOCKCHAIN_TOPIC = globalConfig.CHANNELS.BLOCKCHAIN
const TRANSACTION_TOPIC = globalConfig.CHANNELS.TRANSACTION
let blockchainPeerCount = 0
let transactionPeerCount = 0

const node = await createLibp2p({
  transports: [tcp(), relay()],
  streamMuxers: [yamux()],
  pubsub: gossipsub(),
  // ...
})

// Subscribe to topics
const blockchainSub = await node.pubsub.subscribe(BLOCKCHAIN_TOPIC)
const transactionSub = await node.pubsub.subscribe(TRANSACTION_TOPIC)

// Listen for messages
node.pubsub.addEventListener('message', async (event) => {
  if (event.detail.topic === BLOCKCHAIN_TOPIC) {
    const parsedMessage = JSON.parse(new TextDecoder().decode(event.detail.data))
    await this.blockchain.replaceChain(parsedMessage, true, () => {
      this.transactionPool.clearBlockchainTransactions({ chain: parsedMessage })
    })
  } else if (event.detail.topic === TRANSACTION_TOPIC) {
    const parsedMessage = JSON.parse(new TextDecoder().decode(event.detail.data))
    this.transactionPool.setTransaction(parsedMessage)
  }
})

// Track peers for broadcast-on-join
function checkPeerChanges() {
  const blockchainPeers = node.pubsub.getPeers(BLOCKCHAIN_TOPIC)
  const transactionPeers = node.pubsub.getPeers(TRANSACTION_TOPIC)
  
  if (blockchainPeers.length > blockchainPeerCount) {
    // New peer joined blockchain room
    this.broadcastChain()
  }
  blockchainPeerCount = blockchainPeers.length
  
  if (transactionPeers.length > transactionPeerCount) {
    // New peer joined transaction room
  }
  transactionPeerCount = transactionPeers.length
}

// Call checkPeerChanges periodically or after subscribe
setInterval(() => checkPeerChanges.call(this), 5000)

broadcastChain() {
  const encoded = new TextEncoder().encode(JSON.stringify(this.blockchain.chain))
  node.pubsub.publish(BLOCKCHAIN_TOPIC, encoded)
}

broadcastTransaction(transaction) {
  const encoded = new TextEncoder().encode(JSON.stringify(transaction))
  node.pubsub.publish(TRANSACTION_TOPIC, encoded)
}
```

### package.json

**Remove**:
- `@libp2p/floodsub: "^11.0.22"`
- `@libp2p/mplex: "^12.0.23"`
- `ipfs-pubsub-room: "^3.0.0"`

**Add**:
- `@libp2p/gossipsub: "^15.0.15"`
- `@chainsafe/libp2p-yamux: "^4.0.6"`

## Testing Strategy

1. **Unit tests**: Existing blockchain tests don't depend on pubsub, so they should pass unchanged
2. **Integration**: Run `npm start` and verify:
   - App launches without errors
   - Pubsub module loads (check console for `[discv5]` logs)
   - No floodsub/mplex/ipfs-pubsub-room import errors
3. **Manual P2P test**: When VPS is deployed (Phase 11), test cross-node communication

## Rollback

Same as proposal — git checkout of package.json and pubsub.js restores the old state. No data format changes.

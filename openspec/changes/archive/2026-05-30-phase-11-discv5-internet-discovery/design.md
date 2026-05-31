# Design: discv5 Internet Discovery + Circuit Relay

## Current State

```
┌──────────────────────────────────────────────────────┐
│                    PubSub.discoverPeers()               │
├──────────────────────────────────────────────────────┤
│                                                       │
│  createLibp2p({                                        │
│    transports: [tcp()],                                │
│    streamMuxers: [mplex()],                            │
│    connectionEncrypters: [noise()],                    │
│    pubsub: floodsub(),                                 │
│      // mDNS imported but NOT used!                   │
│  })                                                   │
│                                                       │
│  Result: No peer discovery works                      │
│  - mDNS: imported but not wired into libp2p           │
│  - discv5: installed but never imported               │
│                                                       │
│  Impact: Nodes can only communicate on the same LAN   │
└──────────────────────────────────────────────────────┘
```

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  PUBLIC INFRASTRUCTURE (VPS)                                         │
│  ┌──────────────────────┐    ┌──────────────────────────┐           │
│  │  discv5 Bootstrap     │    │  Circuit Relay Server     │           │
│  │  UDP :9000           │    │  TCP :4001               │           │
│  │  Discovers peers     │    │  Relays traffic for      │           │
│  │  via Kademlia DHT    │    │  NAT'd nodes             │           │
│  └──────────┬───────────┘    └────────┬─────────────────┘           │
│             │ ENR records              │ relay addresses             │
└─────────────┼──────────────────────────┼────────────────────────────┘
              │                          │
              ▼                          ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Node A (public IP)  │    │  Node B (behind NAT) │
│                      │    │                      │
│  discv5: discovers   │    │  discv5: discovers   │
│    other peers       │    │    other peers       │
│                      │    │                      │
│  TCP: direct conn    │◀──▶│  TCP: relay conn     │
│  UPnP: auto port map │    │  DCUtR: tries direct │
│  AutoNAT: detects    │    │  Relay: fallback     │
│    NAT type          │    │                      │
└──────────────────────┘    └──────────────────────┘

┌──────────────────────┐    ┌──────────────────────┐
│  Node C (behind NAT) │    │  Node D (behind NAT) │
│                      │    │                      │
│  discv5: discovers   │    │  discv5: discovers   │
│    Node A, B, D      │    │    Node A, B, C      │
│                      │    │                      │
│  DCUtR: direct via   │    │  Relay: connects via │
│    relay upgrade     │    │    relay server      │
└──────────────────────┘    └──────────────────────┘
```

## Component Design

### 1. discv5 Peer Discovery

```javascript
// How discv5 works in the libp2p stack:

import { Discv5Discovery } from '@chainsafe/discv5'
import { SignableENR } from '@chainsafe/enr'

// Each node generates its own ENR (Ethereum Node Record)
// which contains: peer ID, IP, ports, signature
const myENR = SignableENR.createFromPeerId(peerId)

// Bootstrap ENRs are well-known nodes on the network
// that new nodes use to find others
const bootstrapEnrs = [
  'enr:-MY4...',  // VPS bootstrap node
  'enr:-MY4...',  // fallback bootstrap
]

// Wire into libp2p:
const node = await createLibp2p({
  peerDiscovery: [
    () => new Discv5Discovery({
      enabled: true,
      enr: myENR,
      peerId: peerId,
      bindAddrs: { ip4: '/ip4/0.0.0.0/udp/9000' },
      bootstrapEnrs,
      searchInterval: 30000,  // search every 30s
    })
  ],
  // ... other modules
})
```

**Key decisions:**
- Use `Discv5Discovery` as a peer discovery module (factory function pattern)
- Each node gets its own ENR generated from its libp2p peer ID
- Bootstrap ENRs are configured, not discovered
- 30-second search interval balances discovery speed with network overhead

### 2. Circuit Relay Transport

```javascript
import { relay } from '@libp2p/circuit-relay-v2'

const node = await createLibp2p({
  transports: [tcp(), relay()],  // relay as fallback transport
  // ...
})

// When a peer is behind NAT, connection goes through relay:
// Node A → relay server → Node B
```

**Key decisions:**
- Relay is a fallback, not primary transport
- Direct connections are preferred when possible
- Relay server must be publicly accessible

### 3. AutoNAT — NAT Type Detection

```javascript
import { autoNAT } from '@libp2p/autonat'

const node = await createLibp2p({
  services: {
    autoNAT: autoNAT()  // detects NAT type
  },
  // ...
})

// AutoNAT determines:
// - Public IP (if directly reachable)
// - NAT type: public, cone, or symmetric
// - Whether hole punching is possible
```

**Key decisions:**
- AutoNAT runs passively, probing from relay servers
- Results inform connection strategy
- No user interaction required

### 4. DCUtR — Direct Connection Upgrade

```javascript
import { dcutr } from '@libp2p/dcutr'

const node = await createLibp2p({
  services: {
    dcutr: dcutr()  // upgrade relay to direct
  },
  // ...
})

// Flow:
// 1. Node A connects to Node B via relay
// 2. DCUtR initiates hole punch through NAT
// 3. If successful, relay connection is replaced with direct
// 4. If failed, fall back to relay
```

**Key decisions:**
- DCUtR only works for cone NAT, not symmetric
- Automatic upgrade — no user config
- Falls back to relay if hole punching fails

### 5. UPnP NAT — Automatic Port Mapping

```javascript
import { upnpNat } from '@libp2p/upnp-nat'

const node = await createLibp2p({
  services: {
    upnpNat: upnpNat()  // auto port mapping
  },
  // ...
})

// UPnP attempts to open port on home router:
// - Success: node gets public IP, direct connections
// - Failure: falls back to relay (no error to user)
```

**Key decisions:**
- UPnP is opt-in per node (many home routers support it)
- Silent failure — relay is the fallback
- No user configuration needed

### 6. Combined libp2p Configuration

```javascript
// src/main/app/pubsub.js (target)

import Room from 'ipfs-pubsub-room'
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { floodsub } from '@libp2p/floodsub'
import { Discv5Discovery } from '@chainsafe/discv5'
import { SignableENR } from '@chainsafe/enr'
import { relay } from '@libp2p/circuit-relay-v2'
import { autoNAT } from '@libp2p/autonat'
import { dcutr } from '@libp2p/dcutr'
import { upnpNat } from '@libp2p/upnp-nat'

import globalConfig from '../../config'

class PubSub {
  constructor({ blockchain, transactionPool, wallet }) {
    this.blockchain = blockchain
    this.transactionPool = transactionPool
    this.wallet = wallet
  }

  async discoverPeers() {
    // Generate ENR from wallet's key pair
    const peerId = await this.wallet.getPeerId()
    const enr = SignableENR.createFromPeerId(peerId)

    const node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0'],  // TCP on random port
        announce: [],                      // filled by AutoNAT
      },
      transports: [tcp(), relay()],       // relay as fallback
      streamMuxers: [mplex()],
      connectionEncrypters: [noise()],
      pubsub: floodsub(),
      peerDiscovery: [
        () => new Discv5Discovery({
          enabled: true,
          enr,
          peerId,
          bindAddrs: { ip4: `/ip4/0.0.0.0/udp/${globalConfig.DISCV5_UDP_PORT}` },
          bootstrapEnrs: globalConfig.DISCV5_BOOTSTRAP_ENRS,
          searchInterval: globalConfig.DISCV5_SEARCH_INTERVAL,
        })
      ],
      services: {
        autoNAT: autoNAT(),
        dcutr: dcutr(),
        upnpNat: upnpNat(),
      }
    })

    await node.start()
    console.log('>libp2p has started with discv5 discovery')

    // Create rooms
    this.blockChainRoom = new Room(node, globalConfig.CHANNELS.BLOCKCHAIN)
    this.transactionRoom = new Room(node, globalConfig.CHANNELS.TRANSACTION)

    // ... room event handlers (unchanged)
  }
}
```

## ENR Format

```
ENR (Ethereum Node Record) = signed record containing:

enr:-MY4[signature][seq][secp256k1:public-key][ip4:address][tcp:port][udp:port]

Example:
enr:-MY4QDHyZxP8K7mF3jR2vL9wE5tA6bC1dX0yU8iO3gHfJKlMnOpQrStUvWxYz
   ─────                              ────────  ──────────────  ─────  ─────
    prefix                            sig         key            ip      port

The ENR is:
- Generated from the node's libp2p peer ID (secp256k1 key)
- Signed with the node's private key
- Published to the discv5 DHT
- Looked up by other nodes via discv5
```

## Bootstrap Node Strategy

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  VPS (203.0.113.5 — example)                         │
│                                                      │
│  Services running:                                   │
│  1. discv5 bootstrap node (UDP :9000)               │
│     - Maintains DHT of all known ENRs               │
│     - Responds to peer discovery queries              │
│     - Never disconnects from network                  │
│                                                      │
│  2. circuit relay server (TCP :4001)                │
│     - Relays traffic for NAT'd nodes                │
│     - Bandwidth: ~100 Mbps sufficient                 │
│     - Never disconnects from network                  │
│                                                      │
│  Bootstrap ENRs configured in client:                │
│  bootstrapEnrs: [                                    │
│    'enr:-MY4...',  // primary bootstrap              │
│    'enr:-MY4...',  // fallback (optional)            │
│  ]                                                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## NAT Traversal Flow

```
Node A (behind NAT) wants to connect to Node B (behind NAT):

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Step 1: DISCOVERY (discv5)                                  │
│  ┌──────┐  ENR lookup  ┌──────────┐                        │
│  │Node A│─────────────▶│  VPS     │──▶ returns Node B's ENR│
│  └──────┘              │  DHT     │                        │
│                        └──────────┘                        │
│                                                             │
│  Step 2: DIRECT CONNECTION ATTEMPT                          │
│  ┌──────┐  TCP connect  ┌──────┐                           │
│  │Node A│─────────────▶│Node B│  ← fails (behind NAT)     │
│  └──────┘              └──────┘                           │
│                                                             │
│  Step 3: AUTONAT DETECTION                                   │
│  ┌──────┐  AutoNAT probe  ┌──────┐                        │
│  │Node A│──────────────▶ │Node B│  ← detects NAT type     │
│  └──────┘                └──────┘                        │
│                                                             │
│  Step 4: DCUTR HOLE PUNCH (if cone NAT)                    │
│  ┌──────┐  DCUtR       ┌──────┐                           │
│  │Node A│◀══════════▶ │Node B│  ← direct connection!      │
│  └──────┘  upgrade      └──────┘                        │
│                                                             │
│  Step 5: RELAY FALLBACK (if hole punch fails)              │
│  ┌──────┐  relay  ┌──────┐  relay  ┌──────┐              │
│  │Node A│────────▶│  VPS │────────▶│Node B│              │
│  └──────┘         └──────┘         └──────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Schema

```javascript
// src/config.js additions

const DISCV5_CONFIG = {
  // discv5 bootstrap ENRs (well-known nodes)
  DISCV5_BOOTSTRAP_ENRS: [
    'enr:-MY4...',  // VPS primary
    // 'enr:-MY4...',  // VPS fallback (optional, uncomment when ready)
  ],

  // discv5 UDP port for discovery
  DISCV5_UDP_PORT: 9000,

  // discv5 search interval (ms)
  DISCV5_SEARCH_INTERVAL: 30000,

  // relay server endpoints
  RELAY_ENDPOINTS: [
    '/ip4/203.0.113.5/tcp/4001/p2p/<VPS_PEER_ID>',
  ],
}
```

## Graceful Degradation

```
┌────────────────────────────────────────────────────────────┐
│                                                             │
│  Scenario: VPS is unreachable                               │
│                                                             │
│  1. discv5 bootstrap fails → log warning, continue         │
│  2. relay connection fails → log warning, continue          │
│  3. UPnP fails → silent (relay is fallback)                 │
│  4. Node starts with no peers → user can still mine locally │
│                                                             │
│  Result: App works, just no P2P. No crash.                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Security Considerations

```
┌────────────────────────────────────────────────────────────┐
│                                                             │
│  ENR Signing:                                                │
│  - Each node signs its ENR with its libp2p private key     │
│  - Other nodes verify the signature before connecting       │
│  - Prevents spoofed ENR injection                           │
│                                                             │
│  Noise Encryption:                                           │
│  - All connections use Noise protocol (already in place)    │
│  - End-to-end encrypted                                     │
│  - No changes needed                                        │
│                                                             │
│  Relay Privacy:                                              │
│  - Relay server sees encrypted traffic only                 │
│  - Cannot read blockchain/transaction data                  │
│  - Only sees IP addresses and connection metadata           │
│                                                             │
│  discv5 DHT:                                               │
│  - ENRs are public (IP + port + public key)               │
│  - No sensitive data in ENRs                                │
│  - Bootstrap nodes are trusted (configured, not discovered) │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Migration Path

```
Phase 11: discv5 Internet Discovery
    │
    ├─ Step 1: Add dependencies (discv5, enr, autonat, relay, dcutr, upnp)
    ├─ Step 2: Add config (bootstrap ENRs, relay endpoints, UDP port)
    ├─ Step 3: Wire discv5 into pubsub.js
    ├─ Step 4: Deploy VPS (bootstrap node + relay server)
    ├─ Step 5: Configure bootstrap ENRs in client config
    ├─ Step 6: Test with two local nodes (same machine, different ports)
    ├─ Step 7: Test with nodes on different networks
    └─ Step 8: Iterate on config (search interval, relay endpoints, etc.)

Phase 12 (future): Relay server deployment automation
Phase 13 (future): Bootstrap node dashboard
Phase 14 (future): QUIC transport for faster connections
```

## Why This Design

| Decision | Rationale |
|----------|-----------|
| discv5 for discovery | Industry standard (used by Ethereum, IPFS); Kademlia DHT scales well |
| Circuit relay as fallback | Universal NAT traversal; works for all NAT types |
| DCUtR for direct upgrade | Reduces relay bandwidth when direct connection is possible |
| UPnP for auto port mapping | Zero-config for users with UPnP-enabled routers |
| AutoNAT for detection | Passive, no user input needed |
| Bootstrap ENRs (not discovery) | Trusted entry points; no bootstrapping chicken-and-egg problem |
| 30s search interval | Balances discovery speed with network overhead |
| Graceful degradation | App works even if VPS is down |

# Phase 11: discv5 Internet Discovery + Circuit Relay

## Why

The P2P networking layer currently uses mDNS for peer discovery, which only works on the local network. This means SuccinctCoin nodes cannot discover or connect to each other across the internet — the fundamental requirement for a distributed cryptocurrency network.

```
Current state:                    Target state:
┌──────────┐    LAN only         ┌──────────┐    discv5      ┌──────────┐
│  Node A   │◀────────▶│  Node B   │◀════════════════▶│  Node C   │
│ (same     │  mDNS (broken)   │ (same      │  internet-wide    │ (behind    │
│  subnet)  │                  │  subnet)    │  discovery        │  NAT)      │
└──────────┘                  └──────────┘                   └──────────┘
                                                                 │ relay
                                                                 ▼
                                                          ┌──────────┐
                                                          │  Node D   │
                                                          │ (behind   │
                                                          │  NAT)      │
                                                          └──────────┘
```

Without internet-wide discovery, SuccinctCoin is a single-user demo, not a distributed network.

## What Changes

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  PUBLIC INFRASTRUCTURE (VPS, $5/mo)                            │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ discv5 Bootstrap  │    │ Circuit Relay    │                  │
│  │ Node              │    │ Server           │                  │
│  │ (discovers peers) │    │ (relays traffic  │                  │
│  │                  │    │  for NAT'd nodes) │                  │
│  └────────┬─────────┘    └────────┬─────────┘                  │
│           │                        │                             │
└───────────┼────────────────────────┼─────────────────────────────┘
            │ discv5 ENR             │ circuit relay
            ▼                        ▼
┌──────────────────┐      ┌──────────────────┐
│  Node A (public) │      │  Node B (behind  │
│  direct conn     │      │  NAT, relay conn)│
└──────────────────┘      └──────────────────┘

┌──────────────────┐      ┌──────────────────┐
│  Node C (behind  │      │  Node D (behind  │
│  NAT, relay conn)│      │  NAT, DCUtR conn)│
└──────────────────┘      └──────────────────┘
```

### Dependencies Added

| Package | Purpose | Version |
|---------|---------|---------|
| `@chainsafe/discv5` | Internet-wide peer discovery via Kademlia DHT | ^12.0.1 |
| `@chainsafe/enr` | Ethereum Node Records (peer identity) | ^6.0.1 |
| `@libp2p/autonat` | NAT type detection and hole punching | ^3.0.20 |
| `@libp2p/circuit-relay-v2` | Relay transport for NAT'd nodes | ^4.2.5 |
| `@libp2p/dcutr` | Direct connection upgrade via relay | ^3.0.20 |
| `@libp2p/upnp-nat` | Automatic port mapping on home routers | ^4.0.20 |

### Dependencies Removed

| Package | Reason |
|---------|--------|
| `@libp2p/mdns` | Replaced by discv5 for internet discovery |

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Add discv5, enr, autonat, circuit-relay, dcutr, upnp-nat. Remove mdns. |
| `src/config.js` | Add discv5 config: bootstrap ENRs, relay endpoints, UDP port |
| `src/main/app/pubsub.js` | Replace mDNS with discv5 discovery, add relay/autonat/upnp modules |
| `openspec/specs/p2p-networking/spec.md` | Update peer discovery requirement |
| `openspec/config.yaml` | Add phase 11 to completed phases |

### NAT Traversal Strategy (Zero User Config)

```
Connection attempt: Node A → Node B

Step 1: discv5 discovers Node B's ENR (public DHT lookup)
Step 2: Try direct TCP connection
  ├─ Success → done (Node B has public IP or UPnP worked)
  └─ Failed → Step 3

Step 3: AutoNAT detects Node B's NAT type
  ├─ Public → retry direct
  ├─ Cone NAT → try hole punching via DCUtR
  └─ Symmetric NAT → Step 4

Step 4: Fall back to circuit relay
  └─ Node A connects to relay → relay forwards to Node B
     (transparent, no user config needed)
```

### Bootstrap Node Strategy

Two bootstrap ENRs are configured — one primary, one fallback. These point to the public VPS running both a discv5 bootstrap node and a circuit relay server.

```
VPS Configuration:
  Public IP: 203.0.113.5 (example)
  discv5 UDP: udp/9000
  relay TCP: tcp/4001
  
  ENR format: enr:-MY4... (base64-encoded)
  Generated from the VPS's libp2p peer ID
```

### Client-Side Configuration

```javascript
// src/config.js
const DISCV5_CONFIG = {
  bootstrapEnrs: [
    'enr:-MY4...',  // VPS bootstrap node
    'enr:-MY4...',  // fallback (optional)
  ],
  relayEndpoints: [
    '/ip4/203.0.113.5/tcp/4001/p2p/...',  // VPS relay
  ],
  udpPort: 9000,  // discv5 discovery port
}
```

## Scope

**In scope**:
- Add discv5, enr, autonat, circuit-relay, dcutr, upnp-nat dependencies
- Wire discv5 into libp2p node creation as peer discovery module
- Add circuit relay transport for NAT traversal
- Add AutoNAT for NAT type detection
- Add UPnP NAT for automatic port mapping
- Add DCUtR for direct connection upgrade via relay
- Configure bootstrap ENRs and relay endpoints via config
- Remove mDNS (replaced by discv5)
- Update P2P networking spec
- Test with multiple nodes (local and remote)

**Out of scope**:
- Setting up the actual VPS infrastructure (documented separately)
- Relay server deployment/CI/CD
- NAT port forwarding UI in the renderer
- QUIC transport (future optimization)
- WebRTC transport (future optimization)
- Bootstrap node management dashboard

## Risks

| Risk | Mitigation |
|------|-----------|
| discv5 bootstrap ENRs are wrong | Start with one ENR, validate with debug logging |
| NAT traversal fails for some users | Circuit relay is the universal fallback — always works |
| UDP port blocked by firewall | Relay fallback handles this; UPnP tries auto-configuration |
| VPS goes down | Multiple bootstrap ENRs; relay can be redeployed quickly |
| ENR key format mismatch between v2/v12 | Use @chainsafe/enr v6 for consistent ENR handling |
| Relay server becomes bottleneck | DCUtR upgrades relay connections to direct when possible |

## Success Criteria

- [ ] Nodes on different machines can discover each other via discv5
- [ ] Nodes behind NAT can connect via circuit relay
- [ ] Nodes with UPnP-enabled routers get direct connections
- [ ] DCUtR upgrades relay connections to direct when possible
- [ ] Zero user configuration required — everything works on launch
- [ ] App launches without errors when VPS is unreachable (graceful degradation)

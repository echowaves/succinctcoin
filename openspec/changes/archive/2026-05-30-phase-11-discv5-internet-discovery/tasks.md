# Tasks: Phase 11 — discv5 Internet Discovery + Circuit Relay

## Phase 11.1: Add Dependencies

### Task 11.1.1: Update package.json
- [x] Add `@chainsafe/discv5` ^12.0.1 (peer discovery)
- [x] Add `@chainsafe/enr` ^6.0.1 (ENR handling)
- [x] Add `@libp2p/autonat` ^3.0.20 (NAT detection)
- [x] Add `@libp2p/circuit-relay-v2` ^4.2.5 (relay transport)
- [x] Add `@libp2p/dcutr` ^3.0.20 (direct connection upgrade)
- [x] Add `@libp2p/upnp-nat` ^4.0.20 (auto port mapping)
- [x] Remove `@libp2p/mdns` ^12.0.23 (replaced by discv5)

### Task 11.1.2: Install dependencies
- [x] Run `npm install`
- [x] Verify no peer dependency conflicts
- [x] Run `npm ls @chainsafe/discv5 @chainsafe/enr @libp2p/autonat @libp2p/circuit-relay-v2 @libp2p/dcutr @libp2p/upnp-nat` to verify installation

## Phase 11.2: Add Configuration

### Task 11.2.1: Add discv5 config to src/config.js
- [x] Add `DISCV5_UDP_PORT: 9000`
- [x] Add `DISCV5_SEARCH_INTERVAL: 30000`
- [x] Add `DISCV5_BOOTSTRAP_ENRS: ['enr:-MY4...']` (placeholder, to be filled)
- [x] Add `RELAY_ENDPOINTS: ['/ip4/203.0.113.5/tcp/4001/p2p/<peer-id>']` (placeholder)
- [x] Export new config values in default export

### Task 11.2.2: Document bootstrap ENR setup
- [x] Create `docs/bootstrap-node.md` with VPS setup instructions
- [x] Document how to generate bootstrap ENR from libp2p peer ID
- [x] Document relay server setup on VPS

## Phase 11.3: Wire discv5 into pubsub.js

### Task 11.3.1: Update imports in src/main/app/pubsub.js
- [x] Remove `import { mdns } from '@libp2p/mdns'`
- [x] Add `import { Discv5Discovery } from '@chainsafe/discv5'`
- [x] Add `import { SignableENR } from '@chainsafe/enr'`
- [x] Add `import { relay } from '@libp2p/circuit-relay-v2'`
- [x] Add `import { autoNAT } from '@libp2p/autonat'`
- [x] Add `import { dcutr } from '@libp2p/dcutr'`
- [x] Add `import { upnpNat } from '@libp2p/upnp-nat'`

### Task 11.3.2: Update createLibp2p configuration
- [x] Add `transports: [tcp(), relay()]` (relay as fallback)
- [x] Add `peerDiscovery: [() => new Discv5Discovery({...})]`
- [x] Add `services: { autoNAT: autoNAT(), dcutr: dcutr(), upnpNat: upnpNat() }`
- [x] Wire bootstrap ENRs from config
- [x] Wire relay endpoints from config
- [x] Use wallet's peer ID for ENR generation

### Task 11.3.3: Add peer ID getter to Wallet
- [x] Add `getPeerId()` method to `src/main/blockchain/wallet.js`
- [x] Return the libp2p-compatible peer ID from the wallet's key pair
- [x] Ensure it returns a valid PeerId object

### Task 11.3.4: Add debug logging
- [x] Log when discv5 discovery starts
- [x] Log when peers are discovered
- [x] Log NAT type detected by AutoNAT
- [x] Log relay connection status
- [x] Log DCUtR upgrade attempts/results
- [x] Log UPnP port mapping results

## Phase 11.4: Update P2P Networking Spec

### Task 11.4.1: Update openspec/specs/p2p-networking/spec.md
- [x] Update "Peer discovery" requirement to describe discv5 + relay
- [x] Add scenario: "Node discovers peers via discv5"
- [x] Add scenario: "Node connects via circuit relay when behind NAT"
- [x] Add scenario: "DCUtR upgrades relay connection to direct"
- [x] Add scenario: "Node gracefully degrades when VPS is unreachable"
- [x] Remove mDNS from peer discovery requirement

## Phase 11.5: Validate Changes

### Task 11.5.1: Run tests
- [x] Run `npm test` to verify no regressions
- [x] Verify all 118 tests still pass
- [x] Fix any failures

### Task 11.5.2: Run linter
- [x] Run `npm run lint` to verify no lint errors
- [x] Fix any lint issues

### Task 11.5.3: Test app launch
- [ ] Run `npm start` to verify app launches
- [ ] Verify pubsub module loads without errors
- [ ] Verify graceful degradation when VPS is unreachable
- [ ] Check console logs for discv5 initialization messages

## Phase 11.6: VPS Deployment (Separate from code)

### Task 11.6.1: Provision VPS
- [ ] Spin up a $5/mo VPS (DigitalOcean, Hetzner, etc.)
- [ ] Configure firewall: UDP :9000, TCP :4001
- [ ] Install Node.js (LTS)

### Task 11.6.2: Deploy discv5 bootstrap node
- [ ] Create bootstrap node script using @chainsafe/discv5
- [ ] Generate peer ID and ENR
- [ ] Run bootstrap node on UDP :9000
- [ ] Verify ENR is queryable

### Task 11.6.3: Deploy circuit relay server
- [ ] Create relay server script using @libp2p/circuit-relay-v2
- [ ] Run relay on TCP :4001
- [ ] Verify relay is accessible from outside

### Task 11.6.4: Configure client
- [ ] Add bootstrap ENR to src/config.js
- [ ] Add relay endpoint to src/config.js
- [ ] Test with local node

## Phase 11.7: Integration Testing

### Task 11.7.1: Two-node local test
- [ ] Run two instances on same machine (different ports)
- [ ] Verify discv5 discovers the other node
- [ ] Verify blockchain/transaction rooms form
- [ ] Verify chain broadcast works between nodes

### Task 11.7.2: Two-node remote test
- [ ] Run one instance on VPS, one locally
- [ ] Verify discv5 discovers across internet
- [ ] Verify direct or relay connection established
- [ ] Verify blockchain sync works

### Task 11.7.3: NAT traversal test
- [ ] Run two instances behind NAT (same network)
- [ ] Verify DCUtR or relay connection works
- [ ] Verify no user configuration needed

## Phase 11.8: Finalize

### Task 11.8.1: Update openspec/config.yaml
- [ ] Add Phase 11 to completed phases list

### Task 11.8.2: Archive change
- [ ] Review all success criteria met
- [ ] Archive change in openspec/changes/archive/

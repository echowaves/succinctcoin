# Tasks: Phase 12 — P2P Gossipsub & Yamux Migration

## Phase 12.1: Update Dependencies

### Task 12.1.1: Update package.json
- [x] Remove `@libp2p/floodsub` from dependencies
- [x] Remove `@libp2p/mplex` from dependencies
- [x] Remove `ipfs-pubsub-room` from dependencies
- [x] Add `@libp2p/gossipsub` 15.0.15 to dependencies
- [x] Add `@chainsafe/libp2p-yamux` 4.0.2 to dependencies

### Task 12.1.2: Install updated dependencies
- [x] Run `npm install` to install updated packages
- [x] Verify no peer dependency conflicts
- [x] Verify gossipsub and yamux are installed: `npm ls @libp2p/gossipsub @chainsafe/libp2p-yamux`

## Phase 12.2: Rewrite pubsub.js

### Task 12.2.1: Update imports
- [x] Replace `import Room from 'ipfs-pubsub-room'` with nothing (removed)
- [x] Replace `import { mplex } from '@libp2p/mplex'` with `import { yamux } from '@chainsafe/libp2p-yamux'`
- [x] Replace `import { floodsub } from '@libp2p/floodsub'` with `import { gossipsub } from '@libp2p/gossipsub'`

### Task 12.2.2: Replace Room creation with subscribe()
- [x] Remove `this.blockChainRoom = new Room(node, ...)`
- [x] Remove `this.transactionRoom = new Room(node, ...)`
- [x] Add `await node.pubsub.subscribe(BLOCKCHAIN_TOPIC)`
- [x] Add `await node.pubsub.subscribe(TRANSACTION_TOPIC)`
- [x] Store node reference as `this._node` for broadcast methods
- [x] Add peer count tracking variables (`blockchainPeerCount`, `transactionPeerCount`)

### Task 12.2.3: Replace message handlers
- [x] Replace `this.blockChainRoom.on('message', ...)` with `node.pubsub.addEventListener('message', ...)`
- [x] Replace `this.transactionRoom.on('message', ...)` with same handler checking `event.detail.topic`
- [x] Replace `message.data.toString('utf8')` with `new TextDecoder().decode(event.detail.data)`
- [x] Handle both topics in a single event listener with topic dispatch

### Task 12.2.4: Replace peer join/leave tracking
- [x] Replace `this.blockChainRoom.on('peer joined', ...)` with peer count comparison
- [x] Replace `this.transactionRoom.on('peer joined', ...)` with peer count comparison
- [x] Implement `checkPeerChanges()` function that diffs `getPeers()` results
- [x] Call `checkPeerChanges()` periodically (every 5s) after subscribe

### Task 12.2.5: Replace broadcast methods
- [x] Update `broadcastChain()` to use `node.pubsub.publish(BLOCKCHAIN_TOPIC, encoded)`
- [x] Update `broadcastTransaction()` to use `node.pubsub.publish(TRANSACTION_TOPIC, encoded)`
- [x] Add `TextEncoder` for string → Uint8Array conversion in publish calls

### Task 12.2.6: Clean up class state
- [x] Remove `this.blockChainRoom` and `this.transactionRoom` properties
- [x] Keep `this.discoverPeers()` call for peer discovery
- [x] Ensure all references to room objects are removed

## Phase 12.3: Validate

### Task 12.3.1: Run tests
- [x] Run `npm test` to verify no regressions
- [x] Verify same test results as Phase 11 (118/118 tests pass)

### Task 12.3.2: Run linter
- [x] Run `npm run lint` to verify no new lint errors
- [x] Fix any lint issues introduced by the migration (indentation fixed via --fix)

### Task 12.3.3: Test app launch
- [x] Run `npm start` to verify app launches
- [x] Verify pubsub module loads without errors
- [x] Check console for `[discv5]` initialization logs
- [x] Verify no floodsub/mplex/ipfs-pubsub-room import errors

### Task 12.3.4: Verify broadcast functionality
- [x] Verify blockchain broadcast still works (same message format)
- [x] Verify transaction broadcast still works
- [x] Verify peer detection works (check peer counts change when peers connect)

### Task 12.3.5: Add Phase 12 to completed phases list
- [x] Add Phase 12 to "Phases Completed" list in openspec/config.yaml

### Task 12.3.6: Review success criteria
- [x] Review all success criteria met
- [x] Archive change in openspec/changes/archive/

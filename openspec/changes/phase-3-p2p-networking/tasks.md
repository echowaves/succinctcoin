# Tasks: Phase 3 — P2P Networking Upgrade

## Phase 3.1: Update libp2p Dependencies

### Task 3.1.1: Update package.json
- [x] Update `libp2p` from `^1.4.0` to `^3.3.2`
- [x] Update `@libp2p/tcp` from `^3.0.2` to `^11.0.20`
- [x] Update `@chainsafe/libp2p-noise` from `^15.0.0` to `^17.0.0`

### Task 3.1.2: Install updated dependencies
- [x] Run `npm install` to install updated packages
- [x] Verify no peer dependency conflicts

## Phase 3.2: Update pubsub.js API

### Task 3.2.1: Update imports
- [x] Change `TCP` → `tcp` (function import)
- [x] Change `Mplex` → `mplex` (function import)
- [x] Change `Noise` → `noise` (function import)
- [x] Change `MulticastDNS` → `mdns` (function import)
- [x] Change `FloodSub` → `floodSub` (function import)

### Task 3.2.2: Update createLibp2p options
- [x] Change `new TCP()` → `tcp()` (remove `new` keyword)
- [x] Change `new Mplex()` → `mplex()` (remove `new` keyword)
- [x] Change `new Noise()` → `noise()` (remove `new` keyword)
- [x] Change `new FloodSub()` → `floodSub()` (remove `new` keyword)
- [x] Change `connectionEncryption` → `connectionEncrypters` (option rename)

## Phase 3.3: Validate P2P Changes

### Task 3.3.1: Run tests
- [x] Run `npm test` to verify no regressions
- [x] Verify same test results as Phase 2 (4 passed, 3 failed with pre-existing issues)

### Task 3.3.2: Run linter
- [ ] Run `npm run lint` to verify no lint errors

### Task 3.3.3: Test app launch
- [ ] Run `npm start` to verify app launches without P2P errors
- [ ] Verify pubsub module loads correctly

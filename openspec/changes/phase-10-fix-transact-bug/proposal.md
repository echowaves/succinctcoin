# Phase 10: Fix POST /api/transact Bug

## Why

The POST `/api/transact` endpoint has a pre-existing bug that prevents transactions from being created. When a transaction is submitted, the app crashes with:
- `TypeError: Cannot read properties of undefined (reading 'broadcast')`
- `ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client`

This blocks the core functionality of the cryptocurrency — sending transactions.

## Root Cause Analysis

```
POST /api/transact
│
├─► Async IIFE starts (fire-and-forget pattern)
│   │
│   ├─► wallet.createTransaction()
│   ├─► transaction.validate()
│   └─► transactionPool.setTransaction()
│
├─► pubsub.broadcastTransaction(transaction)  ← transaction is undefined!
│   └─► pubsub is undefined (discoverPeers failed)
│       └─► CRASH: Cannot read properties of undefined
│
└─► res.json({ type: 'success', transaction })  ← sent before async completes
    └─► Later: catch block tries to send error response
        └─► CRASH: ERR_HTTP_HEADERS_SENT
```

### Two bugs:

1. **Async fire-and-forget pattern**: The transaction logic is wrapped in an IIFE that runs asynchronously, but `pubsub.broadcastTransaction(transaction)` and `res.json()` are called immediately after, before the async work completes. `transaction` is always `undefined` at that point.

2. **pubsub undefined**: The `discoverPeers()` call in `init()` fails (no peers to discover), but the error is caught and logged. However, `pubsub` variable is never assigned because `discoverPeers()` is the first thing called and it throws. Looking at the code, `pubsub = new PubSub(...)` is set BEFORE `discoverPeers()`, so `pubsub` should exist. The issue is that `this.transactionRoom` is never created because `discoverPeers()` throws before reaching that line.

Wait, let me re-examine:
- `pubsub = new PubSub({ blockchain, transactionPool, wallet })` — this succeeds
- `await pubsub.discoverPeers()` — this throws "pubsub has not been configured"
- But `pubsub` variable IS set, it's `pubsub.transactionRoom` that's undefined

The error is: `pubsub.broadcastTransaction(transaction)` → `this.transactionRoom.broadcast(...)` → `this.transactionRoom` is undefined because `discoverPeers()` threw before creating the rooms.

## What Changes

### Files Modified

| File | Changes |
|------|---------|
| `src/main/api.js` | Fix async pattern: await transaction creation, proper error handling |
| `src/main/app/pubsub.js` | Handle discoverPeers failure gracefully, ensure rooms are created even without peers |

### Proposed Fix

**api.js** — Remove fire-and-forget IIFE, use proper async/await:
```javascript
api.post('/api/transact', async (req, res) => {
  const { amount, recipient } = req.body
  try {
    const transaction = wallet.createTransaction({
      recipient,
      amount,
      fee: Big(amount).div(1000),
    })
    await transaction.validate()
    transactionPool.setTransaction(transaction)
    pubsub.broadcastTransaction(transaction)
    res.json({ type: 'success', transaction })
  } catch (error) {
    res.status(400).json({ type: 'error', message: error.message })
  }
})
```

**pubsub.js** — Ensure rooms are created even if peer discovery fails:
```javascript
async discoverPeers() {
  const node = await createLibp2p({...})
  await node.start()
  
  // Create rooms FIRST (always)
  this.blockChainRoom = new Room(node, globalConfig.CHANNELS.BLOCKCHAIN)
  this.transactionRoom = new Room(node, globalConfig.CHANNELS.TRANSACTION)
  
  // Then try to discover peers (may fail, but rooms exist)
  // ... rest of peer discovery
}
```

## Scope

**In scope**:
- Fix async pattern in `/api/transact` endpoint
- Ensure pubsub rooms are created even when peer discovery fails
- Test transaction creation works end-to-end

**Out of scope**:
- Fixing other pubsub issues (peer discovery, multi-peer sync)
- Adding transaction validation tests
- Refactoring other endpoints

## Success Criteria

1. POST /api/transact returns `{ type: 'success', transaction }` with valid transaction data
2. No `ERR_HTTP_HEADERS_SENT` errors in console
3. No unhandled promise rejections
4. Transaction appears in transaction pool after submission
5. `npm test` still passes (same results as Phase 9)

## Risks

- **Low risk** — changes are localized to one endpoint and one pubsub method
- **Potential issue**: Changing pubsub behavior might affect P2P sync (but sync is already broken)
- **Mitigation**: Test with app running, verify transaction pool updates correctly

## Migration Steps

1. Fix async pattern in api.js (remove IIFE, use async/await)
2. Fix pubsub.js to create rooms before peer discovery
3. Run `npm test` to verify no regressions
4. Run `npm start` and test POST /api/transact endpoint
5. Update openspec/config.yaml

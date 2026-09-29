// Two-node (then three-node) convergence demo — the CONVERGE_FROM_GENESIS
// and FRESH_NODE_ADOPTION matrix rows: in-process cores with separate
// per-node storage roots demonstrate the success signal — an identical
// genesis yields hash-identical chains, and each node's chain-derived state
// reflects the broadcast transaction (big.js integer units, never floats).
//
// The libp2p stack imported by pubsub.js is ESM-only and unresolvable under
// Jest's CJS transform, and the receive handler under test never touches
// libp2p, so the packages are mocked virtually (the pubsub.test.js pattern).
// The wire surface is exercised at the PubSub message-boundary handlers:
// encodeMessage below is the exact TextEncoder/JSON encoding broadcastChain
// produces — no real transport, no discoverPeers().
jest.mock('electron-is-dev', () => false)
jest.mock('libp2p', () => ({ createLibp2p: jest.fn() }), { virtual: true })
jest.mock('@libp2p/tcp', () => ({ tcp: jest.fn() }), { virtual: true })
jest.mock('@chainsafe/libp2p-yamux', () => ({ yamux: jest.fn() }), { virtual: true })
jest.mock('@chainsafe/libp2p-noise', () => ({ noise: jest.fn() }), { virtual: true })
jest.mock('@libp2p/gossipsub', () => ({ gossipsub: jest.fn() }), { virtual: true })
jest.mock('@chainsafe/discv5', () => ({ Discv5Discovery: jest.fn() }), { virtual: true })
jest.mock('@chainsafe/enr', () => ({ SignableENR: jest.fn() }), { virtual: true })
jest.mock('@libp2p/circuit-relay-v2', () => ({ relay: jest.fn() }), { virtual: true })
jest.mock('@libp2p/autonat', () => ({ autoNAT: jest.fn() }), { virtual: true })
jest.mock('@libp2p/dcutr', () => ({ dcutr: jest.fn() }), { virtual: true })
jest.mock('@libp2p/upnp-nat', () => ({ upnpNat: jest.fn() }), { virtual: true })

import path from 'path'
import fs from 'fs'

import config from './config'
import Wallet from './blockchain/wallet'
import Blockchain from './blockchain'
import TransactionPool from './blockchain/transaction-pool'
import deriveState from './blockchain/state'
import PubSub from './app/pubsub'

const Big = require('big.js')

const WORKER = process.env.JEST_WORKER_ID
const BASE = path.resolve('.test', 'convergence-demo', `worker-${WORKER}`)

const encodeMessage = message => new TextEncoder().encode(JSON.stringify(message))

// Storage keys (block.js / wallet.js / account.js) are derived from
// config.STORE at construction and mining time, so the patch must be in
// place BEFORE that node's instances are constructed or mined: every node's
// wallet load and all of its mining complete under its own patch before the
// next node is built.
// The per-worker base keeps the JEST_WORKER_ID .test/ convention and the
// single-writer wallet invariant (CAP-12): every wallet lives at node-<N>/
// wallet, never the shared .test/wallet.
const patchStoreFor = nodeName => {
  const nodeDir = path.join(BASE, nodeName)
  config.STORE.WALLET = path.join(nodeDir, 'wallet')
  config.STORE.ACCOUNTS = path.join(nodeDir, 'accounts')
  config.STORE.BLOCKS = path.join(nodeDir, 'blocks')
}

const makeWallet = async nodeName => {
  patchStoreFor(nodeName)
  return new Wallet().load()
}

// Builds one node's core (blockchain / pool / pubsub) around an already
// loaded wallet, under that node's STORE patch.
const attachNode = async (nodeName, wallet) => {
  patchStoreFor(nodeName)
  const blockchain = new Blockchain()
  const transactionPool = new TransactionPool()
  const pubsub = new PubSub({ blockchain, transactionPool, wallet })
  return { nodeName, wallet, blockchain, transactionPool, pubsub }
}

// Direct addBlock mining (the same primitive pubsub.test.js uses): no
// lottery gate — AD-11 eligibility is app-semantic and orthogonal to the
// chain-replacement rules this demo covers. Three reward blocks fund the
// sender (heights 1-3 allow reward-only), the fourth carries the user
// transfer (height > 3 requires it); fee = amount/1000 per the app rule.
const mineChainWithTransfer = async (node, recipient, amount) => {
  for (let i = 0; i < 3; i += 1) {
    await node.blockchain.addBlock({ data: [], wallet: node.wallet })
  }
  const transfer = await node.wallet.createTransaction({
    recipient,
    amount,
    fee: Big(amount).div(1000),
  })
  const block = await node.blockchain.addBlock({ data: [transfer], wallet: node.wallet })
  if (!block) throw new Error('demo mining must succeed (check stderr for the addBlock failure)')
}

const chainHashes = node => node.blockchain.chain.map(block => block.hash)

describe('convergence demo (same genesis -> identical chains)', () => {
  beforeEach(() => {
    fs.rmSync(BASE, { recursive: true, force: true })
    fs.mkdirSync(BASE, { recursive: true })
  })

  it('CONVERGE_FROM_GENESIS: a genesis-only node adopts the full chain and its derived balance reflects the transfer', async () => {
    const bWallet = await makeWallet('node-2')
    const a = await attachNode('node-1', await makeWallet('node-1'))
    await mineChainWithTransfer(a, bWallet.publicKey, '100')

    // Node B's core is built only after A finished mining, so B's storage
    // keys never collide with A's; B stays genesis-only.
    const b = await attachNode('node-2', bWallet)

    // The exact wire delivery: what broadcastChain() puts on the topic.
    await b.pubsub.handleBlockchainMessage(encodeMessage(a.blockchain.chain))

    expect(chainHashes(b)).toEqual(chainHashes(a))
    expect(a.blockchain.chain[a.blockchain.chain.length - 1].height).toBeGreaterThan(3)
    expect(b.blockchain.chain[b.blockchain.chain.length - 1].height).toBeGreaterThan(3)

    const stateB = deriveState(b.blockchain.chain)
    expect(new Big(stateB[bWallet.publicKey].balance).eq('100')).toBe(true)
  })

  it('FRESH_NODE_ADOPTION: a third genesis-only core receiving the same broadcast converges hash-identically', async () => {
    // Recipient (B) and fresh node (C) identities exist before A mines, so
    // A's transfer has a real recipient; their cores are built afterwards,
    // still genesis-only.
    const bWallet = await makeWallet('node-2')
    const cWallet = await makeWallet('node-3')
    const a = await attachNode('node-1', await makeWallet('node-1'))
    await mineChainWithTransfer(a, bWallet.publicKey, '100')

    const b = await attachNode('node-2', bWallet)
    const c = await attachNode('node-3', cWallet)

    const broadcast = encodeMessage(a.blockchain.chain)
    await b.pubsub.handleBlockchainMessage(broadcast)
    await c.pubsub.handleBlockchainMessage(broadcast)

    // Convergence, not one-off adoption: all three states agree.
    expect(chainHashes(b)).toEqual(chainHashes(a))
    expect(chainHashes(c)).toEqual(chainHashes(a))
    expect(deriveState(c.blockchain.chain)).toEqual(deriveState(a.blockchain.chain))
    expect(new Big(deriveState(b.blockchain.chain)[bWallet.publicKey].balance).eq('100')).toBe(true)
    expect(new Big(deriveState(c.blockchain.chain)[bWallet.publicKey].balance).eq('100')).toBe(true)
  })
})

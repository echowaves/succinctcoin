// The libp2p stack imported by pubsub.js is ESM-only and unresolvable under
// Jest's CJS transform; the receive handlers under test never touch libp2p,
// so the packages are mocked virtually (factories only, no real modules).
// electron-is-dev requires an Electron runtime and is mocked as production.
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

import Blockchain from '../blockchain'
import TransactionPool from '../blockchain/transaction-pool'
import Wallet from '../blockchain/wallet'
import deriveState from '../blockchain/state'

import PubSub from './pubsub'

const Big = require('big.js')

const encodeMessage = message => new TextEncoder().encode(JSON.stringify(message))

describe('PubSub receive handlers', () => {
  let pubsub
  let blockchain
  let pool

  beforeEach(() => {
    blockchain = new Blockchain()
    pool = new TransactionPool()
    pubsub = new PubSub({ blockchain, transactionPool: pool, wallet: new Wallet() })
  })

  describe('handleTransactionMessage()', () => {
    it('admits a valid received transaction into the pool', async () => {
      // fund the sender on the local chain so validation passes
      const sender = new Wallet()
      await blockchain.addBlock({ data: [], wallet: sender })
      const transaction = await sender.createTransaction({
        recipient: new Wallet().publicKey, amount: '10', fee: '1',
      })

      await pubsub.handleTransactionMessage(encodeMessage(transaction))

      expect(pool.transactionMap[transaction.uuid]).toBeDefined()
      // the admitted transaction is deserialized back to a Transaction with
      // its original identity preserved
      const admitted = pool.transactionMap[transaction.uuid]
      expect(admitted.signature).toEqual(transaction.signature)
      expect(admitted.sender).toEqual(sender.publicKey)
    })

    it('rejects an invalid received transaction without admitting it', async () => {
      const sender = new Wallet() // no funding on the local chain
      const transaction = await sender.createTransaction({
        recipient: new Wallet().publicKey, amount: '10', fee: '1',
      })

      await expect(pubsub.handleTransactionMessage(encodeMessage(transaction)))
        .rejects.toThrow('Amount exceeds balance')
      expect(Object.keys(pool.transactionMap)).toHaveLength(0)
    })
  })

  describe('handleBlockchainMessage()', () => {
    it('replaces the chain and clears the admitted transactions from the pool', async () => {
      const miner = new Wallet()
      const nodeA = new Blockchain()
      await nodeA.addBlock({ data: [], wallet: miner })
      const transaction = await miner.createTransaction({
        recipient: new Wallet().publicKey, amount: '29', fee: '1',
      })
      await nodeA.addBlock({ data: [transaction], wallet: miner })

      // the local pool holds the broadcast transaction until the chain arrives
      pool.setTransaction(transaction)
      expect(pool.transactionMap[transaction.uuid]).toBeDefined()

      await pubsub.handleBlockchainMessage(encodeMessage(nodeA.chain))

      expect(blockchain.chain).toHaveLength(nodeA.chain.length)
      expect(blockchain.chain).not.toBe(nodeA.chain)
      expect(await Blockchain.isValidChain(blockchain.chain)).toBe(true)
      expect(pool.transactionMap[transaction.uuid]).toBeUndefined()
    })

    it('leaves the chain untouched when the incoming chain is identical', async () => {
      const originalLength = blockchain.chain.length

      await pubsub.handleBlockchainMessage(encodeMessage(blockchain.chain))

      expect(blockchain.chain).toHaveLength(originalLength)
    })
  })

  // AD-14 boundaries exercised at the message boundary (STRICTLY_LONGER_
  // ADOPTION / EQUAL_LENGTH_LOWER_HASH / EQUAL_LENGTH_IDENTICAL matrix rows):
  // the wire encoding is encodeMessage, exactly what broadcastChain()
  // publishes; each node's pool holds a live pending tx so the adoption-only
  // pool clear is observable.
  describe('handleBlockchainMessage() chain-replacement boundaries', () => {
    it('STRICTLY_LONGER_ADOPTION: replaces a shorter local chain, discards the self-mined tip, and the adoption callback clears the pool tx carried by the adopted chain', async () => {
      // Local node: one self-mined reward block (its tip, later discarded)
      // and a pending pool tx from the same sender that the arriving chain
      // already carries (same uuid).
      const localMiner = new Wallet()
      const localChain = new Blockchain()
      const localTip = await localChain.addBlock({ data: [], wallet: localMiner })
      const localPool = new TransactionPool()
      const localPubsub = new PubSub({ blockchain: localChain, transactionPool: localPool, wallet: localMiner })

      const source = new Wallet()
      const sourceChain = new Blockchain()
      await sourceChain.addBlock({ data: [], wallet: source })
      const pending = await source.createTransaction({
        recipient: new Wallet().publicKey, amount: '30', fee: '0.03',
      })
      const last = await sourceChain.addBlock({ data: [pending], wallet: source })
      expect(last).toBeTruthy()

      localPool.setTransaction(pending)
      expect(localPool.transactionMap[pending.uuid]).toBeDefined()

      await localPubsub.handleBlockchainMessage(encodeMessage(sourceChain.chain))

      expect(localChain.chain.map(block => block.hash))
        .toEqual(sourceChain.chain.map(block => block.hash))
      // the self-mined local tip is gone; the adopted chain's balances hold
      expect(localChain.chain.some(block => block.hash === localTip.hash)).toBe(false)
      expect(localPool.transactionMap[pending.uuid]).toBeUndefined()
      const state = deriveState(localChain.chain)
      const recipient = pending.recipient
      expect(new Big(state[recipient].balance).eq('30')).toBe(true)
    })

    it('EQUAL_LENGTH_LOWER_HASH: the higher-hash fork adopts the lower, the lower keeps it and rejects the higher, with pool clearing only on adoption', async () => {
      // Both forks share one funded first block so their first divergence
      // is block 2, and the shared pending tx is carried by BOTH chains so
      // whichever side adopts clears it from its own pool.
      const fund = new Wallet()
      const base = new Blockchain()
      await base.addBlock({ data: [], wallet: fund })
      const shared = base.chain[1]

      const sharedTx = await fund.createTransaction({
        recipient: new Wallet().publicKey, amount: '50', fee: '0.05',
      })

      const xMiner = new Wallet()
      const xChain = new Blockchain()
      xChain.chain = [xChain.chain[0], shared]
      const xBlock = await xChain.addBlock({ data: [sharedTx], wallet: xMiner })

      const yMiner = new Wallet()
      const yChain = new Blockchain()
      yChain.chain = [yChain.chain[0], shared]
      const yBlock = await yChain.addBlock({ data: [sharedTx], wallet: yMiner })
      expect(xBlock).toBeTruthy()
      expect(yBlock).toBeTruthy()
      expect(xChain.chain[2].hash).not.toEqual(yChain.chain[2].hash)

      const nodeX = {
        chain: xChain,
        pool: Object.assign(new TransactionPool()),
      }
      nodeX.pool.setTransaction(sharedTx)
      const pubSubX = new PubSub({ blockchain: xChain, transactionPool: nodeX.pool, wallet: xMiner })
      const nodeY = {
        chain: yChain,
        pool: new TransactionPool(),
      }
      nodeY.pool.setTransaction(sharedTx)
      const pubSubY = new PubSub({ blockchain: yChain, transactionPool: nodeY.pool, wallet: yMiner })

      const xLower = xChain.chain[2].hash < yChain.chain[2].hash

      await pubSubX.handleBlockchainMessage(encodeMessage(yChain.chain))
      await pubSubY.handleBlockchainMessage(encodeMessage(xChain.chain))

      if (xLower) {
        // X rejects the higher fork it received...
        expect(xChain.chain.some(block => block.hash === xBlock.hash)).toBe(true)
        expect(xChain.chain[2].hash).toEqual(xBlock.hash)
        // ...and its pool survives untouched (no adoption)
        expect(nodeX.pool.transactionMap[sharedTx.uuid]).toBeDefined()
        // Y adopts the lower fork and its pool clears the adopted tx
        expect(yChain.chain.map(block => block.hash))
          .toEqual([xChain.chain[0].hash, shared.hash, xBlock.hash])
        expect(nodeY.pool.transactionMap[sharedTx.uuid]).toBeUndefined()
      } else {
        expect(yChain.chain.some(block => block.hash === yBlock.hash)).toBe(true)
        expect(yChain.chain[2].hash).toEqual(yBlock.hash)
        expect(nodeY.pool.transactionMap[sharedTx.uuid]).toBeDefined()
        expect(xChain.chain.map(block => block.hash))
          .toEqual([yChain.chain[0].hash, shared.hash, yBlock.hash])
        expect(nodeX.pool.transactionMap[sharedTx.uuid]).toBeUndefined()
      }
    })

    it('EQUAL_LENGTH_IDENTICAL: delivers an identical chain as a no-op and leaves the pool alone', async () => {
      const miner = new Wallet()
      const chain = new Blockchain()
      await chain.addBlock({ data: [], wallet: miner })
      const pending = await miner.createTransaction({
        recipient: new Wallet().publicKey, amount: '40', fee: '0.04',
      })
      const block = await chain.addBlock({ data: [pending], wallet: miner })
      expect(block).toBeTruthy()

      const localPool = new TransactionPool()
      localPool.setTransaction(pending)
      const localPubsub = new PubSub({ blockchain: chain, transactionPool: localPool, wallet: miner })
      const before = chain.chain

      await localPubsub.handleBlockchainMessage(encodeMessage(chain.chain))

      expect(chain.chain).toBe(before)
      expect(localPool.transactionMap[pending.uuid]).toBeDefined()
    })
  })
})

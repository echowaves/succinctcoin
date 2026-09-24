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

import PubSub from './pubsub'

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
})

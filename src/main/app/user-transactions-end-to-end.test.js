// transaction-miner imports the app config, which imports electron-is-dev
// (ESM, requires an Electron runtime); the flow under test never reads it.
jest.mock('electron-is-dev', () => false)

import Blockchain from '../blockchain'
import deriveState from '../blockchain/state'
import TransactionPool from '../blockchain/transaction-pool'
import Wallet from '../blockchain/wallet'

import TransactionMiner from './transaction-miner'

describe('user transactions end to end', () => {
  it('admits, mines, propagates, and derives a funded transfer on two nodes', async () => {
    const sender = new Wallet()
    const miner = new Wallet()
    const recipient = new Wallet().publicKey
    const nodeA = new Blockchain()
    const nodeB = new Blockchain()
    const poolA = new TransactionPool()
    const poolB = new TransactionPool()
    const pubsubA = { broadcastChain: jest.fn() }

    for (let index = 0; index < 3; index += 1) {
      await nodeA.addBlock({ data: [], wallet: sender })
    }

    await nodeB.replaceChain(nodeA.chain)
    nodeB.chain = nodeB.chain.slice()

    const transaction = await sender.createTransaction({
      recipient,
      amount: '50',
      fee: '0.05',
    })
    await transaction.validate({ state: deriveState(nodeB.chain) })
    poolB.setTransaction(transaction)
    expect(poolB.transactionMap[transaction.uuid]).toBeDefined()

    poolA.setTransaction(transaction)
    const transactionMiner = new TransactionMiner({
      blockchain: nodeA,
      transactionPool: poolA,
      wallet: miner,
      pubsub: pubsubA,
    })

    await transactionMiner.mineTransactions()

    expect(pubsubA.broadcastChain).toHaveBeenCalledTimes(1)
    expect(poolA.transactionMap[transaction.uuid]).toBeUndefined()
    expect(deriveState(nodeA.chain)[recipient].balance).toBe('50')

    await nodeB.replaceChain(nodeA.chain, () => {
      nodeA.chain.forEach(block => {
        poolB.clearBlockchainTransactions({ block })
      })
    })

    expect(nodeB.chain).toHaveLength(nodeA.chain.length)
    expect(deriveState(nodeB.chain)[recipient].balance).toBe('50')
    expect(poolB.transactionMap[transaction.uuid]).toBeUndefined()
    expect(await Blockchain.isValidChain(nodeB.chain)).toBe(true)
  })

  it('rejects an invalid received transaction without admitting it', async () => {
    const blockchain = new Blockchain()
    const pool = new TransactionPool()
    const sender = new Wallet()
    const transaction = await sender.createTransaction({
      recipient: new Wallet().publicKey,
      amount: '5',
      fee: '0.005',
    })

    await expect(transaction.validate({ state: deriveState(blockchain.chain) }))
      .rejects.toThrow('Amount exceeds balance')
    expect(pool.transactionMap[transaction.uuid]).toBeUndefined()
  })
})
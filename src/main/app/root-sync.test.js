import Wallet from '../blockchain/wallet'
import Blockchain from '../blockchain'
import TransactionPool from '../blockchain/transaction-pool'

import syncWithRootState from './root-sync'

// mines `count` reward-only blocks on top of the given chain's tip,
// funding `wallet` via the chain-derived state (AD-10)
async function mineRewardBlocks(blockchain, wallet, count) {
  for (let i = 0; i < count; i += 1) {
    await blockchain.addBlock({ data: [], wallet })
  }
}

describe('syncWithRootState (AD-5/AD-13 bootstrap-only root)', () => {
  let logMock
  let blockchain
  let transactionPool

  beforeEach(async () => {
    logMock = jest.fn()
    global.console.log = logMock
    global.console.error = jest.fn()

    blockchain = new Blockchain()
    transactionPool = new TransactionPool()
  })

  describe('when the local chain is genesis-only (ROOT_BOOTSTRAP)', () => {
    it('adopts the root chain and the root pool', async () => {
      const rootWallet = new Wallet()
      const rootBlockchain = new Blockchain()
      await mineRewardBlocks(rootBlockchain, rootWallet, 2)
      const rootChain = rootBlockchain.chain
      const rootPoolMap = { 'remote-a': { uuid: 'remote-a', sender: 'x' } }

      await syncWithRootState({
        blockchain,
        transactionPool,
        fetchRootChain: async () => rootChain,
        fetchRootPool: async () => rootPoolMap,
      })

      expect(blockchain.chain).toStrictEqual(rootChain)
      expect(transactionPool.transactionMap).toStrictEqual(rootPoolMap)
    })
  })

  describe('when the local chain is non-empty (ROOT_SYNC_GATED)', () => {
    it('ignores the root chain and merges the pool additively (local wins collisions)', async () => {
      const localWallet = new Wallet()
      await mineRewardBlocks(blockchain, localWallet, 1)
      const originalChain = blockchain.chain
      const originalTip = originalChain[1]

      const localEntry = { uuid: 'shared', sender: 'local' }
      transactionPool.setTransaction(localEntry)

      const rootWallet = new Wallet()
      const rootBlockchain = new Blockchain()
      await mineRewardBlocks(rootBlockchain, rootWallet, 3)
      const rootChain = rootBlockchain.chain
      const rootPoolMap = {
        shared: { uuid: 'shared', sender: 'remote' },
        'remote-c': { uuid: 'remote-c', sender: 'c' },
      }

      await syncWithRootState({
        blockchain,
        transactionPool,
        fetchRootChain: async () => rootChain,
        fetchRootPool: async () => rootPoolMap,
      })

      expect(blockchain.chain).toStrictEqual(originalChain)
      expect(blockchain.chain[1]).toBe(originalTip)

      expect(transactionPool.transactionMap).toStrictEqual({
        shared: localEntry,
        'remote-c': rootPoolMap['remote-c'],
      })
      expect(transactionPool.transactionMap.shared).toBe(localEntry)
    })
  })
})

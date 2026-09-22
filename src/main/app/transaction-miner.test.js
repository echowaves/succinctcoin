// transaction-miner imports the app config, which imports electron-is-dev
// (ESM, requires an Electron runtime); the tick logic under test never reads it.
jest.mock('electron-is-dev', () => false)

import globalConfig from '../../config'
import coreConfig from '../config'
import Blockchain from '../blockchain'
import TransactionPool from '../blockchain/transaction-pool'
import Wallet from '../blockchain/wallet'
import isLotteryWinner from '../blockchain/lottery'

import TransactionMiner from './transaction-miner'

// Isolate the tick WIRING (win/lose gate, in-flight guard, start/stop) from
// the lottery math (covered in lottery.test.js) by mocking the decision.
jest.mock('../blockchain/lottery', () => jest.fn())

describe('TransactionMiner autonomous tick (AD-4)', () => {
  let blockchain
  let pool
  let wallet
  let pubsub
  let miner
  const originalOdds = coreConfig.LOTTERY_ODDS
  const originalInterval = globalConfig.MINING_RECHECK_INTERVAL

  beforeEach(() => {
    jest.useFakeTimers()
    globalConfig.MINING_RECHECK_INTERVAL = 1000
    coreConfig.LOTTERY_ODDS = 1000
    blockchain = new Blockchain()
    pool = new TransactionPool()
    wallet = new Wallet()
    pubsub = { broadcastChain: jest.fn() }
    miner = new TransactionMiner({
      blockchain, transactionPool: pool, wallet, pubsub,
    })
    isLotteryWinner.mockReset()
  })

  afterEach(() => {
    miner.stop()
    jest.useRealTimers()
    coreConfig.LOTTERY_ODDS = originalOdds
    globalConfig.MINING_RECHECK_INTERVAL = originalInterval
  })

  describe('LOSING_TICK', () => {
    it('produces nothing when the node loses the lottery', async () => {
      isLotteryWinner.mockReturnValue(false)
      const before = blockchain.chain.length

      miner.start()
      await jest.advanceTimersByTimeAsync(1000)
      await jest.advanceTimersByTimeAsync(1000)

      expect(blockchain.chain).toHaveLength(before)
      expect(pubsub.broadcastChain).not.toHaveBeenCalled()
      expect(isLotteryWinner).toHaveBeenCalledTimes(2)
    })
  })

  describe('WINNING_TICK / EMPTY_POOL_WIN', () => {
    it('mines exactly one block and clears the pool when the node wins', async () => {
      isLotteryWinner.mockReturnValue(true)
      // fund the miner via a reward block so its user tx passes state validation
      await blockchain.addBlock({ data: [], wallet })
      const recipient = new Wallet().publicKey
      const transaction = await wallet.createTransaction({
        recipient, amount: '29', fee: '1',
      })
      pool.setTransaction(transaction)
      const before = blockchain.chain.length

      miner.start()
      await jest.advanceTimersByTimeAsync(1000)

      expect(blockchain.chain).toHaveLength(before + 1)
      expect(pubsub.broadcastChain).toHaveBeenCalledTimes(1)
      expect(pool.transactionMap[transaction.uuid]).toBeUndefined()
      // the mined block carries the reward tx plus the user tx
      const mined = blockchain.chain[blockchain.chain.length - 1]
      expect(mined.data.some(tx => tx.uuid === transaction.uuid)).toBe(true)
    })
  })

  describe('in-flight guard', () => {
    it('does not start a second tick while one is running', async () => {
      isLotteryWinner.mockReturnValue(true)
      // make the in-flight mine never settle so a second tick can overlap
      miner.mineTransactions = jest.fn(() => new Promise(() => {}))

      miner.start()
      await jest.advanceTimersByTimeAsync(1000)
      await jest.advanceTimersByTimeAsync(1000)

      expect(miner.mineTransactions).toHaveBeenCalledTimes(1)
      await jest.clearAllTimers()
    })
  })

  describe('NOT_STARTED', () => {
    it('produces no blocks when the miner is never started', async () => {
      isLotteryWinner.mockReturnValue(true)
      const before = blockchain.chain.length

      await jest.advanceTimersByTimeAsync(5000)

      expect(blockchain.chain).toHaveLength(before)
      expect(isLotteryWinner).not.toHaveBeenCalled()
    })
  })

  describe('real-integration win', () => {
    it('mines through the actual lottery when odds force a win', async () => {
      // restore the real decision for this test only
      const realIsWinner = jest.requireActual('../blockchain/lottery').default
      isLotteryWinner.mockImplementation(realIsWinner)
      // odds=1 => threshold 2^512 > any 512-bit digest => guaranteed win
      coreConfig.LOTTERY_ODDS = 1
      // fund the miner so its user tx would pass state validation if present
      await blockchain.addBlock({ data: [], wallet })
      const before = blockchain.chain.length

      miner.start()
      await jest.advanceTimersByTimeAsync(1000)

      expect(blockchain.chain).toHaveLength(before + 1)
      expect(pubsub.broadcastChain).toHaveBeenCalledTimes(1)
    })
  })
})

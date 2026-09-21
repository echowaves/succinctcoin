import Wallet from './wallet'
import Block from './block'
import deriveState from './state'
import TransactionPool from './transaction-pool'

import Blockchain from './index'

// import config from '../config'
//
// const path = require('path')

// mines `count` reward-only blocks by `wallet` on top of genesis,
// funding the wallet via the chain-derived state (AD-10)
async function fundWallet(wallet, count) {
  let last = Block.genesis()
  const chain = []

  for (let i = 0; i < count; i += 1) {
    const block = await new Block({ lastBlock: last, data: [] }).mineBlock({ wallet })
    chain.push(block)
    last = block
  }

  return [Block.genesis(), ...chain]
}

describe('TransactionPool', () => {
  // afterAll(() => {
  //   fs.removeSync(path.resolve(config.STORE.WALLET, '..'))
  // })

  let transactionPool,
    transaction,
    senderWallet,
    recipient,
    amount,
    fee,
    state

  beforeEach(async () => {
    transactionPool = new TransactionPool()
    senderWallet = new Wallet()
    // fund the sender via a mined reward chain; validation checks the
    // balance against the derived chain state (AD-10), never disk
    state = deriveState(await fundWallet(senderWallet, 50))

    recipient = new Wallet().publicKey

    amount = '49'
    fee = '1'

    transaction = await senderWallet.createTransaction({ recipient, amount, fee })
  })

  describe('setTransaction()', () => {
    it('adds a transaction', () => {
      transactionPool.setTransaction(transaction)

      expect(transactionPool.transactionMap[transaction.uuid])
        .toBe(transaction)
    })
  })

  describe('existingTransaction()', () => {
    it('returns an existing transaction given an input address', () => {
      transactionPool.setTransaction(transaction)

      expect(
        transactionPool.existingTransaction({ sender: senderWallet.publicKey }),
      ).toBe(transaction)
    })
  })

  describe('validTransactions()', () => {
    let validTransactions,
      errorMock

    beforeEach(async () => {
      validTransactions = []
      errorMock = jest.fn()
      global.console.error = errorMock

      state = {}
      for (let i = 0; i < 10; i += 1) {
        senderWallet = new Wallet()
        recipient = new Wallet().publicKey
        // fund each sender via its own reward chain (AD-10)
        state = { ...state, ...deriveState(await fundWallet(senderWallet, 1)) }

        amount = '29'
        fee = '1'
        const transaction = await senderWallet.createTransaction({ recipient, amount, fee })

        if (i % 3 === 0) {
          transaction.amount = 999999
        } else if (i % 3 === 1) {
          transaction.signature = `.${transaction.signature}`// alter signature
        } else {
          validTransactions.push(transaction)
        }
        transactionPool.setTransaction(transaction)
      }
    })

    it('returns valid transaction', async () => {
      expect(await transactionPool.validTransactions({ state })).toEqual(validTransactions)
    })

    it('logs errors for the invalid transactions', async () => {
      await transactionPool.validTransactions({ state })
      expect(errorMock).toHaveBeenCalled()
    })
    // })
  })

  describe('clear()', () => {
    it('clears the transactions', () => {
      transactionPool.clear()

      expect(transactionPool.transactionMap).toEqual({})
    })
  })

  describe('clearBlockchainTransactions()', () => {
    it('clears the pool of any existing blockchain transactions', async () => {
      const blockchain = new Blockchain()

      senderWallet = new Wallet()

      // first 3 reward bootstrap blocks also fund the sender (AD-10)
      await blockchain.addBlock({ data: [], wallet: senderWallet })
      await blockchain.addBlock({ data: [], wallet: senderWallet })
      await blockchain.addBlock({ data: [], wallet: senderWallet })

      amount = '29'
      fee = '1'
      const transaction = await senderWallet.createTransaction({ recipient, amount, fee })

      transactionPool.setTransaction(transaction)
      expect(Object.values(transactionPool.transactionMap)).toHaveLength(1)

      const block = await blockchain.addBlock({
        data: [
          transaction,
        ],
        wallet: senderWallet,
      })
      if (block) {
        transactionPool.clearBlockchainTransactions({ block })
      }
      expect(Object.values(transactionPool.transactionMap)).toHaveLength(0)
    })
  })
})

import Wallet from './wallet'
import Transaction from './transaction'
import Account from './account'

import Crypto from '../util/crypto'

const path = require('path')
const { STORE } = require('../config')

describe('Transaction', () => {
  let transaction,
    senderWallet,
    recipient,
    amount,
    fee

  beforeEach(() => {
    senderWallet = new Wallet()
    recipient = 'recipient-public-key'
    amount = 50
    fee = 1
    transaction = senderWallet.createTransaction({ recipient, amount, fee })
  })

  describe('properties', () => {
    it('has `uuid`, `timestamp`, `sender`, `recipient`, `amount`, `fee`', () => {
      expect(transaction).toHaveProperty('uuid')
      expect(transaction).toHaveProperty('timestamp')
      expect(transaction).toHaveProperty('sender')
      expect(transaction).toHaveProperty('recipient')
      expect(transaction).toHaveProperty('amount')
      expect(transaction).toHaveProperty('fee')
    })
  })

  describe('validTransaction()', () => {
    let account
    beforeEach(() => {
      // create account associated with wallet
      account = new Account({ publicKey: senderWallet.publicKey })
      account.balance = 51
      account.store(path.join(STORE.ACCOUNTS, Crypto.hash(senderWallet.publicKey)))
    })

    describe('when the transaction is valid', () => {
      // it('returns true', () => {
      //   expect(transaction.validTransaction()).toBe(true)
      // })
    })

    // describe('when the transaction is invalid', () => {
    //   describe('and a transaction outputMap value is invalid', () => {
    //     it('returns false and logs an error', () => {
    //       transaction.outputMap[senderWallet.publicKey] = 999999
    //
    //       expect(Transaction.validTransaction(transaction)).toBe(false)
    //       expect(errorMock).toHaveBeenCalled()
    //     })
    //   })
    //
    //   describe('and the transaction input signature is invalid', () => {
    //     it('returns false and logs an error', () => {
    //       transaction.input.signature = new Wallet().sign('data')
    //
    //       expect(Transaction.validTransaction(transaction)).toBe(false)
    //       expect(errorMock).toHaveBeenCalled()
    //     })
    //   })
    // })
  })

  // describe('rewardTransaction()', () => {
  //   let rewardTransaction,
  //     minerWallet
  //
  //   beforeEach(() => {
  //     minerWallet = new Wallet()
  //     rewardTransaction = Transaction.rewardTransaction({ minerWallet })
  //   })
  //
  //   it('creates a transaction with the reward input', () => {
  //     expect(rewardTransaction.input).toEqual(REWARD_INPUT)
  //   })
  //
  //   it('creates one transaction for the miner with the `MINING_REWARD`', () => {
  //     expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINING_REWARD)
  //   })
  // })
})

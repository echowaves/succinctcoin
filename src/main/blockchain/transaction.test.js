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
    amount = 49
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

  describe('validate()', () => {
    let account
    beforeEach(() => {
      // create account associated with wallet (sender's account)
      account = new Account({ publicKey: senderWallet.publicKey })
      account.balance = 50
      account.store()
    })

    describe('when the transaction is valid', () => {
      it('returns true', () => {
        expect(transaction.validate()).toBe(true)
      })
    })

    describe('when the transaction is invalid', () => {
      describe('because sender account is invalid', () => {
        beforeEach(() => {
          transaction.sender = 'invalid public key'
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('No such key or file name found on disk')
        })
      })

      describe('because `amount` + `fee` exceeds senders balance', () => {
        beforeEach(() => {
          transaction.amount = 50
          transaction.fee = 1
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Amount exceeds balance')
        })
      })
    })
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

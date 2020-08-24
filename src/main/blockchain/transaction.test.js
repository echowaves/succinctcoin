import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

import Wallet from './wallet'
import Account from './account'
import Transaction from './transaction'

const { REWARD_ADDRESS, STAKE_ADDRESS } = require('../config')

describe('Transaction', () => {
  let transaction,
    wallet,
    recipient,
    amount,
    fee

  beforeEach(() => {
    wallet = new Wallet()
    recipient = 'recipient-public-key'
    amount = 49
    fee = 1
    transaction = wallet.createTransaction({ recipient, amount, fee })
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

  describe('transaction.validate()', () => {
    let account
    beforeEach(() => {
      // create account associated with wallet (sender's account)
      account = new Account({ publicKey: wallet.publicKey })
      account.balance = 50
      account.store()
    })

    describe('when the transaction is valid', () => {
      it('returns true', () => {
        expect(transaction.validate()).toBe(true)
      })
      it('creates an instance of `Transaction`', () => {
        expect(transaction instanceof Transaction).toBe(true)
      })

      describe('for reward transaction', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ REWARD_ADDRESS, amount, fee })
        })
        it('returns true', () => {
          expect(transaction.validate()).toBe(true)
        })
      })

      describe('for stake transaction', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ STAKE_ADDRESS, amount, fee })
        })
        it('returns true', () => {
          expect(transaction.validate()).toBe(true)
        })
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

      describe('because the `amount` is 0', () => {
        beforeEach(() => {
          transaction.amount = 0
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Amount invalid')
        })
      })

      describe('because the `amount` is < 0', () => {
        beforeEach(() => {
          transaction.amount = -1
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Amount invalid')
        })
      })

      describe('because the `fee` is < 0', () => {
        beforeEach(() => {
          transaction.fee = -1
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Fee invalid')
        })
      })

      describe('because the signature is altered', () => {
        beforeEach(() => {
          transaction.signature = `.${transaction.signature}`// alter signature
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
        })
      })

      describe('when `uuid` is altered', () => {
        beforeEach(() => {
          transaction.uuid = uuidv4()// alter uuid
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
        })
      })

      describe('when `timestamp` is altered', () => {
        beforeEach(() => {
          transaction.timestamp = moment.utc().valueOf() // alter timestamp
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
        })
      })

      describe('when `sender` is altered', () => {
        beforeEach(() => {
          account = new Account({ publicKey: new Wallet().publicKey })
          account.balance = 50
          account.store()

          transaction.sender = account.publicKey // alter sender
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
        })
      })

      describe('when `recipient` is altered', () => {
        beforeEach(() => {
          account = new Account({ publicKey: new Wallet().publicKey })
          account.balance = 50
          account.store()

          transaction.recipient = account.publicKey // alter recipient
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
        })
      })

      describe('when `ammount` is altered', () => {
        beforeEach(() => {
          transaction.ammount = 1 // alter ammount
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
        })
      })

      describe('when `fee` is altered', () => {
        beforeEach(() => {
          transaction.fee = 0.5 // alter fee
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
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

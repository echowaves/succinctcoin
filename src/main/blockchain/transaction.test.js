import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import { FlashStore } from 'flash-store'

import Wallet from './wallet'
import Account from './account'
import Transaction from './transaction'

const fs = require('fs-extra')
const path = require('path')
const { STORE } = require('../config')

const { REWARD_ADDRESS, STAKE_ADDRESS } = require('../config')

describe('Transaction', () => {
  let transaction,
    wallet,
    recipient,
    amount,
    fee

  beforeEach(() => {
    wallet = new Wallet()
    recipient = new Wallet().publicKey
    amount = 49
    fee = 1
    transaction = wallet.createTransaction({ recipient, amount, fee })
  })

  // describe('flash-store', () => {
  //   it('check how storage works', async () => {
  //     fs.removeSync(path.resolve(STORE.UUID, 'sqlite.db'))
  //
  //     const flashStore = new FlashStore(STORE.UUID)
  //     console.log(await flashStore.size)
  //
  //     let times = 50000
  //     while (times--) {
  //       const uuid = uuidv4()
  //       if (await flashStore.has(uuid)) {
  //         console.log(`duplicate id: ${uuid}`)
  //       }
  //       await flashStore.set(uuid, times)
  //     }
  //   })
  // })

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

    describe('when the `transaction` is valid', () => {
      it('returns true', () => {
        expect(transaction.validate()).toBe(true)
      })
      it('creates an instance of `Transaction`', () => {
        expect(transaction instanceof Transaction).toBe(true)
      })

      describe('for reward `transaction`', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: REWARD_ADDRESS, amount, fee })
        })
        it('returns true', () => {
          expect(transaction.validate()).toBe(true)
        })
      })

      describe('for stake `transaction`', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: STAKE_ADDRESS, amount: 5, fee })
        })
        it('returns true', () => {
          expect(transaction.validate()).toBe(true)
        })
      })
    })

    describe('when the `transaction` is invalid', () => {
      describe('because `sender` account does not exist', () => {
        beforeEach(() => {
          transaction.sender = new Wallet().publicKey
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('No such key or file name found on disk')
        })
      })

      describe('because `sender` account is invalid', () => {
        beforeEach(() => {
          transaction.sender = 'invalid public key'
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Sender invalid')
        })
      })

      describe('because `sender` & `recipient` are the same', () => {
        beforeEach(() => {
          transaction.recipient = wallet.publicKey
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Sender and Recipient are the same')
        })
      })

      describe('because recipient account is invalid', () => {
        beforeEach(() => {
          transaction.recipient = 'invalid public key'
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Recipient invalid')
        })
      })

      describe('because `amount` + `fee` exceeds senders balance', () => {
        beforeEach(() => {
          transaction.amount = 50
          transaction.fee = 1
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Amount exceeds balance')
        })
      })

      describe('because the `amount` is 0', () => {
        beforeEach(() => {
          transaction.amount = 0
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Amount invalid')
        })
      })

      describe('because the `amount` is < 0', () => {
        beforeEach(() => {
          transaction.amount = -1
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Amount invalid')
        })
      })

      describe('because the `fee` is < 0', () => {
        beforeEach(() => {
          transaction.fee = -1
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Fee invalid')
        })
      })

      describe('because the signature is altered', () => {
        beforeEach(() => {
          transaction.signature = `.${transaction.signature}`// alter signature
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Invalid signature')
        })
      })

      describe('because failed to validate signature', () => {
        describe('when `uuid` is altered', () => {
          beforeEach(() => {
            transaction.uuid = uuidv4()// alter uuid
          })
          it('throws an error', () => {
            expect(() => transaction.validate())
              .toThrowError('Invalid signature')
          })
        })
        describe('when `timestamp` is altered', () => {
          beforeEach(() => {
            transaction.timestamp = moment.utc().valueOf() // alter timestamp
          })
          it('throws an error', () => {
            expect(() => transaction.validate())
              .toThrowError('Invalid signature')
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
              .toThrowError('Invalid signature')
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
              .toThrowError('Invalid signature')
          })
        })
        describe('when `ammount` is altered', () => {
          beforeEach(() => {
            transaction.ammount = 1 // alter ammount
          })
          it('throws an error', () => {
            expect(() => transaction.validate())
              .toThrowError('Invalid signature')
          })
        })
        describe('when `fee` is altered', () => {
          beforeEach(() => {
            transaction.fee = 0.5 // alter fee
          })
          it('throws an error', () => {
            expect(() => transaction.validate())
              .toThrowError('Invalid signature')
          })
        })
      })

      describe('when reward `amount` is invalid', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: REWARD_ADDRESS, amount: -1, fee })
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Invalid reward amount')
        })
      })

      describe('when stake `amount` is invalid', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: STAKE_ADDRESS, amount: 0, fee })
        })
        it('throws an error', () => {
          expect(() => transaction.validate())
            .toThrowError('Invalid stake amount')
        })
      })
    })

    describe('stake `transaction`', () => {
      beforeEach(() => {
        // create account associated with wallet (sender's account)
        account.balance = 100
        account.stake = 5 // can't have more than 10% of the amount in stake
        account.store()
      })

      describe('when trying to stake less or equals than 1/10 of the account value', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: STAKE_ADDRESS, amount: 5, fee: 0 })
        })
        it('should succeed', () => {
          expect(transaction.validate()).toBe(true)
        })
      })
      describe('when trying to stake more than 1/10 of the account value', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: STAKE_ADDRESS, amount: 6, fee: 0 })
        })
        it('should fail', () => {
          expect(() => transaction.validate())
            .toThrowError('Stake too high')
        })
      })
      describe('when trying to release less than currently staked', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: STAKE_ADDRESS, amount: -4, fee: 0 })
        })
        it('should succeed', () => {
          expect(transaction.validate()).toBe(true)
        })
      })
      describe('when trying to release more than currently staked', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: STAKE_ADDRESS, amount: -6, fee: 0 })
        })
        it('should fail', () => {
          expect(() => transaction.validate())
            .toThrowError('Not enough stake')
        })
      })
    })
  })
})

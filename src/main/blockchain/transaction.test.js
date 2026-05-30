import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

import Wallet from './wallet'
import Account from './account'
import Transaction from './transaction'

// import { FlashStore } from 'flash-store'

import config from '../config'
//
// const path = require('path')

describe('Transaction', () => {
  // afterAll(() => {
  //   fs.removeSync(path.resolve(config.STORE.WALLET, '..'))
  // })

  let transaction,
    wallet,
    recipient,
    amount,
    fee

  beforeEach(() => {
    wallet = new Wallet()
    recipient = new Wallet().publicKey
    amount = '49'
    fee = '1'
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
    beforeEach(async () => {
      // create account associated with wallet (sender's account)
      account = new Account({ publicKey: wallet.publicKey })
      account.balance = '50'
      await account.store()
    })

    describe('when the `transaction` is valid', () => {
      it('returns true', async () => {
        expect(await transaction.validate()).toBe(true)
      })
      it('creates an instance of `Transaction`', () => {
        expect(transaction instanceof Transaction).toBe(true)
      })

      describe('for reward `transaction`', () => {
        beforeEach(() => {
          transaction = wallet.createRewardTransaction()
        })
        it('returns true', async () => {
          expect(await transaction.validate()).toBe(true)
        })
      })

      describe('for stake `transaction`', () => {
        beforeEach(() => {
          transaction = wallet.createStakeTransaction({ amount: 5, fee })
        })
        it('returns true', async () => {
          expect(await transaction.validate()).toBe(true)
        })
      })
    })

    describe('when the `transaction` is invalid', () => {
      describe('because `sender` account does not exist', () => {
        beforeEach(() => {
          transaction.sender = new Wallet().publicKey
          // const account = new Account({ publicKey: transaction.sender })
          // fs.removeSync(path.resolve(account.key))
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('No such key or file name found on disk')
        })
      })

      describe('because `sender` account is invalid', () => {
        beforeEach(() => {
          transaction.sender = 'invalid public key'
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Sender invalid')
        })
      })

      describe('because `sender` & `recipient` are the same', () => {
        beforeEach(() => {
          transaction.recipient = wallet.publicKey
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Sender and Recipient are the same')
        })
      })

      describe('because recipient account is invalid', () => {
        beforeEach(() => {
          transaction.recipient = 'invalid public key'
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Recipient invalid')
        })
      })

      describe('because `amount` + `fee` exceeds senders balance', () => {
        beforeEach(() => {
          transaction.amount = 50
          transaction.fee = 1
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Amount exceeds balance')
        })
      })

      describe('because the `amount` is 0', () => {
        beforeEach(() => {
          transaction.amount = 0
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Amount invalid')
        })
      })

      describe('because the `amount` is < 0', () => {
        beforeEach(() => {
          transaction.amount = -1
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Amount invalid')
        })
      })

      describe('because the `fee` is < 0', () => {
        beforeEach(() => {
          transaction.fee = -1
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Fee invalid')
        })
      })

      describe('because the signature is altered', () => {
        beforeEach(() => {
          transaction.signature = `.${transaction.signature}`// alter signature
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Invalid transaction signature')
        })
      })

      describe('because failed to validate signature', () => {
        describe('when `uuid` is altered', () => {
          beforeEach(() => {
            transaction.uuid = uuidv4()// alter uuid
          })
          it('throws an error', async () => {
            await expect(transaction.validate())
              .rejects
              .toThrowError('Invalid transaction signature')
          })
        })
        describe('when `timestamp` is altered', () => {
          beforeEach(() => {
            transaction.timestamp = moment.utc().valueOf() // alter timestamp
          })
          it('throws an error', async () => {
            await expect(transaction.validate())
              .rejects
              .toThrowError('Invalid transaction signature')
          })
        })
        describe('when `sender` is altered', () => {
          beforeEach(async () => {
            account = new Account({ publicKey: new Wallet().publicKey })
            account.balance = 50
            await account.store()

            transaction.sender = account.publicKey // alter sender
          })
          it('throws an error', async () => {
            await expect(transaction.validate())
              .rejects
              .toThrowError('Invalid transaction signature')
          })
        })
        describe('when `recipient` is altered', () => {
          beforeEach(async () => {
            account = new Account({ publicKey: new Wallet().publicKey })
            account.balance = 50
            await account.store()

            transaction.recipient = account.publicKey // alter recipient
          })
          it('throws an error', async () => {
            await expect(transaction.validate())
              .rejects
              .toThrowError('Invalid transaction signature')
          })
        })
        describe('when `ammount` is altered', () => {
          beforeEach(() => {
            transaction.ammount = 1 // alter ammount
          })
          it('throws an error', async () => {
            await expect(transaction.validate())
              .rejects
              .toThrowError('Invalid transaction signature')
          })
        })
        describe('when `fee` is altered', () => {
          beforeEach(() => {
            transaction.fee = 0.5 // alter fee
          })
          it('throws an error', async () => {
            await expect(transaction.validate())
              .rejects
              .toThrowError('Invalid transaction signature')
          })
        })
      })

      describe('when reward `amount` is invalid', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: config.REWARD_ADDRESS, amount: config.REWARD_AMOUNT - 1, fee })
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Invalid reward amount')
        })
      })

      describe('when reward `fee` is invalid', () => {
        beforeEach(() => {
          transaction = wallet.createTransaction({ recipient: config.REWARD_ADDRESS, amount: config.REWARD_AMOUNT, fee: 1 })
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Invalid reward fee')
        })
      })

      describe('when stake `amount` is invalid', () => {
        beforeEach(() => {
          transaction = wallet.createStakeTransaction({ amount: 0, fee })
        })
        it('throws an error', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Invalid stake amount')
        })
      })
    })

    describe('stake `transaction`', () => {
      beforeEach(async () => {
        // create account associated with wallet (sender's account)
        account.balance = 100
        account.stake = 5 // can't have more than 10% of the amount in stake
        await account.store()
      })

      describe('when trying to stake less or equals than 1/10 of the account value', () => {
        beforeEach(() => {
          transaction = wallet.createStakeTransaction({ amount: 5, fee: 1 })
        })
        it('should succeed', async () => {
          expect(await transaction.validate()).toBe(true)
        })
      })
      describe('when trying to stake more than 1/10 of the account value', () => {
        beforeEach(() => {
          transaction = wallet.createStakeTransaction({ amount: 6, fee: 1 })
        })
        it('should fail', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Stake too high')
        })
      })
      describe('when trying to release less than currently staked', () => {
        beforeEach(() => {
          transaction = wallet.createStakeTransaction({ amount: -4, fee: 1 })
        })
        it('should succeed', async () => {
          expect(await transaction.validate()).toBe(true)
        })
      })
      describe('when trying to release more than currently staked', () => {
        beforeEach(() => {
          transaction = wallet.createStakeTransaction({ amount: -6, fee: 1 })
        })
        it('should fail', async () => {
          await expect(transaction.validate())
            .rejects
            .toThrowError('Not enough stake')
        })
      })
    })
  })
})

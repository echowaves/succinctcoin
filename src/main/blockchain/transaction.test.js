import { randomUUID } from 'crypto'

import dayjs from 'dayjs'

import config from '../config'

import Wallet from './wallet'
import Block from './block'
import deriveState from './state'
import Transaction from './transaction'

// import { FlashStore } from 'flash-store'

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

beforeEach(async () => {
    wallet = new Wallet()
    recipient = new Wallet().publicKey
    amount = '49'
    fee = '1'
    transaction = await wallet.createTransaction({ recipient, amount, fee })
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
    // the sender is funded via a mined reward chain; validation checks
    // the balance against the derived chain state (AD-10), never disk
    let state
    beforeEach(async () => {
      const chain = [Block.genesis()]
      let last = chain[0]

      for (let i = 0; i < 5; i += 1) {
        const block = await new Block({ lastBlock: last, data: [] }).mineBlock({ wallet })
        chain.push(block)
        last = block
      }

      state = deriveState(chain)
    })

    describe('when the `transaction` is valid', () => {
      it('returns true', async () => {
        expect(await transaction.validate({ state })).toBe(true)
      })
      it('creates an instance of `Transaction`', () => {
        expect(transaction instanceof Transaction).toBe(true)
      })

      describe('for reward `transaction`', () => {
        beforeEach(async () => {
          transaction = await wallet.createRewardTransaction()
        })
        it('returns true', async () => {
          expect(await transaction.validate({ state })).toBe(true)
        })
      })

      describe('for stake `transaction`', () => {
        beforeEach(async () => {
          transaction = await wallet.createStakeTransaction({ amount: 5, fee })
        })
        it('returns true', async () => {
          expect(await transaction.validate({ state })).toBe(true)
        })
      })
    })

    describe('when the `transaction` is invalid', () => {
      describe('because `sender` is absent from the derived state', () => {
        beforeEach(async () => {
          // a transaction genuinely from an account that has no balance in
          // the derived state (properly signed by that account)
          const unknownWallet = new Wallet()
          transaction = await unknownWallet.createTransaction({ recipient, amount, fee })
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Amount exceeds balance')
        })
      })

      describe('because `sender` account is invalid', () => {
        beforeEach(() => {
          transaction.sender = 'invalid public key'
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Sender invalid')
        })
      })

      describe('because `sender` & `recipient` are the same', () => {
        beforeEach(() => {
          transaction.recipient = wallet.publicKey
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Sender and Recipient are the same')
        })
      })

      describe('because recipient account is invalid', () => {
        beforeEach(() => {
          transaction.recipient = 'invalid public key'
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Recipient invalid')
        })
      })

      describe('because `amount` + `fee` exceeds senders balance', () => {
        beforeEach(async () => {
          // freshly signed transaction: 500 + 1 fee > 500 balance
          transaction = await wallet.createTransaction({ recipient, amount: '500', fee: '1' })
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Amount exceeds balance')
        })
      })

      describe('because the `amount` is 0', () => {
        beforeEach(() => {
          transaction.amount = 0
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Amount invalid')
        })
      })

      describe('because the `amount` is < 0', () => {
        beforeEach(() => {
          transaction.amount = -1
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Amount invalid')
        })
      })

      describe('because the `fee` is < 0', () => {
        beforeEach(() => {
          transaction.fee = -1
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Fee invalid')
        })
      })

      describe('because the signature is altered', () => {
        beforeEach(() => {
          transaction.signature = `.${transaction.signature}`// alter signature
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Invalid transaction signature')
        })
      })

      describe('because failed to validate signature', () => {
        describe('when `uuid` is altered', () => {
          beforeEach(() => {
            transaction.uuid = randomUUID()// alter uuid
          })
          it('throws an error', async () => {
            await expect(transaction.validate({ state }))
              .rejects
              .toThrow('Invalid transaction signature')
          })
        })
        describe('when `timestamp` is altered', () => {
          beforeEach(() => {
            transaction.timestamp = dayjs().utc().add(1, 'day').valueOf() // alter timestamp to future
          })
          it('throws an error', async () => {
            await expect(transaction.validate({ state }))
              .rejects
              .toThrow('Invalid transaction signature')
          })
        })
        describe('when `sender` is altered', () => {
          beforeEach(() => {
            transaction.sender = new Wallet().publicKey // alter sender
          })
          it('throws an error', async () => {
            await expect(transaction.validate({ state }))
              .rejects
              .toThrow('Invalid transaction signature')
          })
        })
        describe('when `recipient` is altered', () => {
          beforeEach(() => {
            transaction.recipient = new Wallet().publicKey // alter recipient
          })
          it('throws an error', async () => {
            await expect(transaction.validate({ state }))
              .rejects
              .toThrow('Invalid transaction signature')
          })
        })
        describe('when `ammount` is altered', () => {
          beforeEach(() => {
            transaction.amount = 1 // alter amount
          })
          it('throws an error', async () => {
            await expect(transaction.validate({ state }))
              .rejects
              .toThrow('Invalid transaction signature')
          })
        })
        describe('when `fee` is altered', () => {
          beforeEach(() => {
            transaction.fee = 0.5 // alter fee
          })
          it('throws an error', async () => {
            await expect(transaction.validate({ state }))
              .rejects
              .toThrow('Invalid transaction signature')
          })
        })
      })

      describe('when reward `amount` is invalid', () => {
        beforeEach(async () => {
          transaction = await wallet.createTransaction({ recipient: config.REWARD_ADDRESS, amount: config.REWARD_AMOUNT - 1, fee })
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Invalid reward amount')
        })
      })

      describe('when reward `fee` is invalid', () => {
        beforeEach(async () => {
          transaction = await wallet.createTransaction({ recipient: config.REWARD_ADDRESS, amount: config.REWARD_AMOUNT, fee: 1 })
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Invalid reward fee')
        })
      })

      describe('when stake `amount` is invalid', () => {
        beforeEach(async () => {
          transaction = await wallet.createStakeTransaction({ amount: 0, fee })
        })
        it('throws an error', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Invalid stake amount')
        })
      })
    })

    describe('stake `transaction`', () => {
      beforeEach(async () => {
        // explicit derived state: 100 free, 5 locked in stake
        // (can't have more than 10% of the balance in stake)
        state = {
          [wallet.publicKey]: { balance: '100', stake: '5' },
        }
      })

      describe('when trying to stake less or equals than 1/10 of the account value', () => {
        beforeEach(async () => {
          transaction = await wallet.createStakeTransaction({ amount: 5, fee: 1 })
        })
        it('should succeed', async () => {
          expect(await transaction.validate({ state })).toBe(true)
        })
      })
      describe('when trying to stake more than 1/10 of the account value', () => {
        beforeEach(async () => {
          transaction = await wallet.createStakeTransaction({ amount: 6, fee: 1 })
        })
        it('should fail', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Stake too high')
        })
      })
      describe('when trying to release less than currently staked', () => {
        beforeEach(async () => {
          transaction = await wallet.createStakeTransaction({ amount: -4, fee: 1 })
        })
        it('should succeed', async () => {
          expect(await transaction.validate({ state })).toBe(true)
        })
      })
      describe('when trying to release more than currently staked', () => {
        beforeEach(async () => {
          transaction = await wallet.createStakeTransaction({ amount: -6, fee: 1 })
        })
        it('should fail', async () => {
          await expect(transaction.validate({ state }))
            .rejects
            .toThrow('Not enough stake')
        })
      })
    })
  })
})

const Account = require('./account')

// const { verifySignature } = require('../util')
// const { REWARD_INPUT, MINING_REWARD } = require('../config')

describe.only('Account', () => {
  const
    lastTransactionId = 123,
    publicKey = 321
  let account

  beforeEach(() => {
    account = new Account({ lastTransactionId, publicKey })
  })

  describe('properties', () => {
    it('has an `lastTransactionId`, `publicKey`, `balance`, `stake`', () => {
      expect(account).toHaveProperty('lastTransactionId')
      expect(account).toHaveProperty('publicKey')
      expect(account).toHaveProperty('balance')
      expect(account).toHaveProperty('stake')
    })
    describe('lastTransactionId', () => {
      it('should be equal value from `Constructor`', () => {
        expect(account.lastTransactionId).toEqual(lastTransactionId)
      })
    })
    describe('publicKey', () => {
      it('should be equal value from `Constructor`', () => {
        expect(account.publicKey).toEqual(publicKey)
      })
    })
    describe('balance', () => {
      it('initial value value should be 0', () => {
        expect(account.balance).toEqual(0)
      })
    })
    describe('stake', () => {
      it('initial value value should be 0', () => {
        expect(account.stake).toEqual(0)
      })
    })
  })

  describe('methods', () => {
    describe('addBalance()', () => {
      const amount = 42
      it('should add proper amount', () => {
        account.addBalance({ amount })
        expect(account.balance).toEqual(amount)
      })
    })

    describe('subtractBalance()', () => {
      const amount = 42
      beforeEach(() => {
        account.addBalance({ amount: amount * 2 })
      })
      it('should substract proper amount', () => {
        account.subtractBalance({ amount })
        expect(account.balance).toEqual(amount)
      })
      it('should fail subtracting amount bigger than `balance`', () => {
        expect(() => {
          account.subtractBalance({ amount: amount * 3 })
        }).toThrowError('trying to substract bigger amount than possible')
      })
    })

    describe('addStake()', () => {
      const amount = 42
      it('should add proper amount', () => {
        account.addStake({ amount })
        expect(account.stake).toEqual(amount)
      })
    })

    describe('subtractStake()', () => {
      const amount = 42
      beforeEach(() => {
        account.addStake({ amount: amount * 2 })
      })
      it('should substract proper amount', () => {
        account.subtractStake({ amount })
        expect(account.stake).toEqual(amount)
      })
      it('should fail subtracting amount bigger than `stake`', () => {
        expect(() => {
          account.subtractStake({ amount: amount * 3 })
        }).toThrowError('trying to substract bigger amount than possible')
      })
    })
  })
})

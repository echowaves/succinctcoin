import moment from 'moment'

import Account from './account'
import Crypto from '../util/crypto'

const fs = require('fs-extra')
const path = require('path')

const Big = require('big.js')

const { STORE } = require('../config')

describe('Account', () => {
  const
    amount = '42',
    publicKey = '321'
  let account

  beforeEach(() => {
    account = new Account({ publicKey })
  })

  afterAll(() => fs.removeSync(path.resolve(STORE.ACCOUNTS)))

  describe('properties', () => {
    it('has `KEY`, `publicKey`, `balance`, `stake`, `stakeTimestamp`', () => {
      expect(account).toHaveProperty('KEY')
      expect(account).toHaveProperty('publicKey')
      expect(account).toHaveProperty('balance')
      expect(account).toHaveProperty('stake')
      expect(account).toHaveProperty('stakeTimestamp')
    })
    describe('KEY', () => {
      it('shold have correct `KEY` derived from `publicKey`', () => {
        expect(account.KEY).toEqual(path.join(STORE.ACCOUNTS, Crypto.hash(account.publicKey)))
      })
    })
    describe('publicKey', () => {
      it('should be equal value from `Constructor`', () => {
        expect(account.publicKey).toEqual(publicKey)
      })
    })
    describe('balance', () => {
      it('initial value value should be 0', () => {
        expect(account.balance).toEqual('0')
      })
    })
    describe('stake', () => {
      it('initial value value should be 0', () => {
        expect(account.stake).toEqual('0')
      })
    })
    describe('stakeTimestamp', () => {
      it('initial value value should be 0', () => {
        expect(account.stakeTimestamp).not.toEqual(0)
      })
    })
  })

  describe('methods', () => {
    describe('account.addBalance()', () => {
      it('should add proper amount', () => {
        account.addBalance({ amount })
        expect(account.balance).toEqual(amount)
      })
    })

    describe('account.subtractBalance()', () => {
      beforeEach(() => {
        account.addBalance({ amount: amount * 2 })
      })
      it('should substract proper amount', () => {
        account.subtractBalance({ amount })
        expect(account.balance).toEqual(amount)
      })
      it('should fail subtracting amount bigger than `balance`', () => {
        expect(() => {
          account.subtractBalance({ amount: Big(amount).times(3).valueOf() })
        }).toThrowError('trying to substract bigger amount than possible')
      })
    })

    describe('account.addStake()', () => {
      beforeEach(() => {
        account.addBalance({ amount: Big(amount).times(2).valueOf() })
      })
      it('should add proper amount to `stake`', () => {
        account.addStake({ amount })
        expect(account.stake).toEqual(amount)
      })
      it('should substract proper amount from `balance`', () => {
        account.addStake({ amount })
        expect(account.balance).toEqual(amount)
      })
      it('should fail to add stake bigger than the `balance`', () => {
        expect(() => {
          account.addStake({ amount: Big(amount).times(3).valueOf() })
        }).toThrowError('trying to substract bigger amount than possible')
      })

      it('should add increment `stakeTimestamp`', async () => {
        const { stakeTimestamp } = account
        await new Promise(resolve => setTimeout(resolve, 1)) // otherwise it works too fast
        account.addStake({ amount })
        expect(account.stakeTimestamp).toBeGreaterThan(stakeTimestamp)
        expect(account.stakeTimestamp).toBeLessThan(moment.utc(stakeTimestamp).add(1, 'second').valueOf())
      })
    })

    describe('account.subtractStake()', () => {
      beforeEach(() => {
        account.addBalance({ amount: Big(amount).times(2).valueOf() })
        account.addStake({ amount })
      })
      it('should substract proper amount from `stake`', () => {
        account.subtractStake({ amount })
        expect(account.stake).toBe('0')
      })
      it('should add proper amount to `balance`', () => {
        account.subtractStake({ amount })
        expect(account.balance).toEqual(Big(amount).times(2).valueOf())
      })
      it('should add increment stakeTimestamp', async () => {
        const { stakeTimestamp } = account
        await new Promise(resolve => setTimeout(resolve, 1)) // otherwise it works too fast
        account.subtractStake({ amount })
        expect(account.stakeTimestamp).toBeGreaterThan(stakeTimestamp)
        expect(account.stakeTimestamp).toBeLessThan(moment.utc(stakeTimestamp).add(1, 'second').valueOf())
      })
      it('should fail subtracting amount bigger than `stake`', () => {
        expect(() => {
          account.subtractStake({ amount: Big(amount).times(3).valueOf() })
        }).toThrowError('trying to substract bigger amount than possible')
      })
    })

    describe('account.stringify()', () => {
      it('should generate valid JSON string representing the `Account`', () => {
        account.addBalance({ amount })
        account.addStake({ amount })
        const jsonAccount = account.stringify()
        expect(typeof jsonAccount).toBe('string')
      })
    })

    describe('account.parse()', () => {
      it('should generate an `Account` instance from JSON', () => {
        account.addBalance({ amount })
        account.addStake({ amount })
        const jsonAccount = account.stringify()
        const generatedAccount = account.parse(jsonAccount)
        expect(generatedAccount).toMatchObject(account)
      })
      it('should fail to generate an `Account` object from wrong JSON', () => {
        expect(() => {
          account.parse('{ some: json }')
        }).toThrowError('Unexpected token s in JSON at position 2')
      })
    })

    // describe('calculateBalance()', () => {
    //   xit('should walk the chain and calculate the balance', () => {
    //   })
    // })
  })
})

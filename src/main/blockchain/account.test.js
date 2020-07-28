import Account from './account'

describe('Account', () => {
  const
    amount = 42,
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
      it('should add proper amount', () => {
        account.addBalance({ amount })
        expect(account.balance).toEqual(amount)
      })
    })

    describe('subtractBalance()', () => {
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
      it('should add proper amount', () => {
        account.addStake({ amount })
        expect(account.stake).toEqual(amount)
      })
    })

    describe('subtractStake()', () => {
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

    describe('stringify()', () => {
      it('should generate valid JSON string representing the `Account`', () => {
        account.addBalance({ amount })
        account.addStake({ amount })
        const jsonAccount = Account.stringify({ account })
        expect(typeof jsonAccount).toBe('string')
      })
    })

    describe('parse()', () => {
      it('should generate an `Account` object from JSON', () => {
        account.addBalance({ amount })
        account.addStake({ amount })
        const jsonAccount = Account.stringify({ account })
        const generatedAccount = Account.parse({ jsonAccount })

        expect(generatedAccount).toMatchObject(account)
      })
      it('should fail to generate an `Account` object from wrong JSON', () => {
        expect(() => {
          Account.parse({ jsonAccount: '{ some: json }' })
        }).toThrowError('Unexpected token s in JSON at position 2')
      })
    })
  })
})

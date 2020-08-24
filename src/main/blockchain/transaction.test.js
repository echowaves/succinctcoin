import Wallet from './wallet'
import Account from './account'
import Transaction from './transaction'

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

  describe('transaction.validate()', () => {
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
      it('creates an instance of `Transaction`', () => {
        expect(transaction instanceof Transaction).toBe(true)
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

      describe('because the signature is wrong', () => {
        beforeEach(() => {
          transaction.signature = `.${transaction.signature}`// alter signature
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

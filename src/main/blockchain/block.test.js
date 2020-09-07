import Block from './block'
import Wallet from './wallet'
import Account from './account'
import Crypto from '../util/crypto'

const { GENESIS_DATA } = require('../config')
const { REWARD_ADDRESS /* , STAKE_ADDRESS */ } = require('../config')

describe('Block', () => {
  const genesisBlock = Block.genesis()

  const data = [
    'blockchain',
    'data',
  ]
  const block = new Block({
    lastBlock: genesisBlock, data,
  })

  it('has a `height`, `uuid`, `timestamp`, `lastHash`, `hash`, `validator`, `signature` and `data` property', () => {
    expect(block).toHaveProperty('height')
    expect(block).toHaveProperty('uuid')
    expect(block).toHaveProperty('timestamp')
    expect(block).toHaveProperty('lastHash')
    expect(block).toHaveProperty('hash')
    expect(block).toHaveProperty('validator')
    expect(block).toHaveProperty('signature')
    expect(block).toHaveProperty('data')
  })

  it('references the last block', () => {
    expect(block.height).toBe(genesisBlock.height + 1)
    expect(block.uuid).not.toBe(genesisBlock.uuid)
    expect(block.timestamp).not.toBe(genesisBlock.timestamp)
    expect(block.lastHash).toBe(genesisBlock.hash)
    expect(block.hash).not.toBe(genesisBlock.hash)
  })

  describe('genesis()', () => {
    it('returns a Block instance', () => {
      expect(genesisBlock instanceof Block).toBe(true)
    })

    it('returns the genesis data', () => {
      expect(genesisBlock).toMatchObject(GENESIS_DATA)
    })
  })

  describe('mineBlock()', () => {
    const lastBlock = Block.genesis()
    const data = 'mined data'
    const wallet = new Wallet()

    const minedBlock = new Block({ lastBlock, data }).mineBlock({ wallet })

    it('returns a Block instance', () => {
      expect(minedBlock instanceof Block).toBe(true)
    })

    it('sets the `lastHash` to be the `hash` of the lastBlock', () => {
      expect(minedBlock.lastHash).toEqual(lastBlock.hash)
    })

    it('sets the `data`', () => {
      expect(minedBlock.data).toEqual(data)
    })

    it('sets a `timestamp`', () => {
      expect(minedBlock.timestamp).not.toEqual(undefined)
    })

    it('sets a `validator` to `wallet` publicKey', () => {
      expect(minedBlock.validator).toEqual(wallet.publicKey)
    })

    it('creates a SHA512 `hash` based on the proper inputs', () => {
      expect(minedBlock.hash)
        .toEqual(
          Crypto.hash(
            minedBlock.height,
            minedBlock.uuid,
            minedBlock.timestamp,
            minedBlock.validator,
            minedBlock.lastHash,
            minedBlock.data,
          )
        )
    })
  })

  describe('validate()', () => {
    let wallet
    let recipient
    let genesisBlock
    let data
    let minedBlock1

    let transactions2
    let minedBlock2

    beforeEach(() => {
      wallet = new Wallet()
      wallet.store()
      // sender account should contain balance
      const account = new Account({
        publicKey: wallet.publicKey,
      })
      account.balance = 50
      account.store()

      recipient = new Wallet().publicKey

      genesisBlock = Block.genesis()
      data = 'mined data'

      minedBlock1 = new Block({ lastBlock: genesisBlock, data }).mineBlock({ wallet })

      transactions2 = []

      transactions2.push(wallet.createRewardTransaction())
      transactions2.push(wallet.createStakeTransaction({ amount: 5, fee: 1 }))
      transactions2.push(wallet.createTransaction(wallet.createTransaction({ recipient, amount: 10, fee: 1 })))

      minedBlock2 = new Block({ lastBlock: minedBlock1, data: transactions2 }).mineBlock({ wallet })
    })

    describe('when block is valid', () => {
      // every tedt in this group should start with foloowing line
      // expect(minedBlock2.validate()).toBe(true)
      it('should have `height`that is greater by 1 than the previous block `height`', () => {
        expect(minedBlock2.validate()).toBe(true)
        expect(minedBlock2.height).toEqual(minedBlock1.height + 1)
      })
      // it('should contain `uuid` that is unique across all blocks', () => {
      // })
      it('should have `lastHash` that points to previous block', () => {
        expect(minedBlock2.lastHash).toEqual(minedBlock1.hash)
      })
      it('should contain verifiable `hash`', () => {
        expect(minedBlock2.validate()).toBe(true)
        expect(Crypto.hash(
          minedBlock2.height,
          minedBlock2.uuid,
          minedBlock2.timestamp,
          minedBlock2.validator,
          minedBlock2.lastHash,
          minedBlock2.data,
        )).toBe(minedBlock2.hash)
      })
      it('should contain non empty `data`', () => {
        expect(minedBlock2.validate()).toBe(true)
        expect(JSON.stringify(minedBlock2.data)).toBeDefined()
        expect(minedBlock2.data).not.toBeNull()
        expect(JSON.stringify(minedBlock2.data)).not.toBe('{}')
      })
      it('should always contain 1 reward `transaction`', () => {
        const transactions = minedBlock2.data
        expect(transactions.filter(transaction => transaction.recipient === REWARD_ADDRESS)).toHaveLength(1)
      })
      it('should contain at least one non reward `transaction`', () => {
        const transactions = minedBlock2.data
        expect(transactions.filter(transaction => transaction.recipient !== REWARD_ADDRESS).length).toBeGreaterThan(0)
      })
      it('should have transactions that are ordered ASC by `timestamp`', () => {
        const transactions = minedBlock2.data
        const sortedTransaction = [...transactions] // create a clone of transactions before sorting it
        sortedTransaction.sort((a, b) => (a.timestamp >= b.timestamp ? 1 : -1))
        expect(transactions).toStrictEqual(sortedTransaction)
      })
      it('should contain `validator` that is valid public key of an existing `account`', () => {
        expect(Crypto.isPublicKey({ publicKey: minedBlock2.validator })).toBe(true)
      })
      it('should contain only valid transactions', () => {
        // the impementatino is a bit smelly
        minedBlock2.data.forEach(transaction => transaction.validate())
        expect(minedBlock2.validate()).toBe(true)
      })
      it('should have the `timestamp` equal to the `timestamp` of the reward `transaction`', () => {
      })
      it('should have the `timestamp` of each `transaction` to be less than the block\'s `timestamp`', () => {
      })
    })
    describe('when block is invalid', () => {
      it('should have `height`that is greater by 1 than the previous block `height`', () => {
      })
      // it('should contain `uuid` that is unique across all blocks', () => {
      // })
      it('should have `lastHash` that points to previous block', () => {
      })
      it('should contain verifiable `hash`', () => {
      })
      it('should contain non empty `data`', () => {
      })
      it('should always contain 1 reward `transaction`', () => {
      })
      it('should contain at least one non reward `transaction`', () => {
      })
      it('should have transactions that are ordered ASC by `timestamp`', () => {
      })
      it('should contain `validator` that is valid public key of an existing `account`', () => {
      })
      it('should be signed by `validator`', () => {
      })
      it('`timestamp` should be +- 3 minutes from now', () => {
      })
      it('should contain no less than half of transactions outstanding in the pool at the time of mining', () => {
      })
      it('should contain only valid transactions', () => {
      })
      it('should have the `timestamp` equal to the `timestamp` of the reward `transaction`', () => {
      })
      it('should have the `timestamp` of each `transaction` to be less than the block\'s `timestamp`', () => {
      })
    })
  })
})

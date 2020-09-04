import Block from './block'
import Wallet from './wallet'
import Crypto from '../util/crypto'

const { GENESIS_DATA } = require('../config')

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
    const wallet = new Wallet()
    const genesisBlock = Block.genesis()
    const data = 'mined data'
    const minedBlock1 = new Block({ lastBlock: genesisBlock, data }).mineBlock({ wallet })
    const minedBlock2 = new Block({ lastBlock: minedBlock1, data }).mineBlock({ wallet })

    describe('when block is valid', () => {
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
      it('should always contain a reward `transaction`', () => {
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
    describe('when block is invalid', () => {
    })
  })
})

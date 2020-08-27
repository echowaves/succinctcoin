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

    // it('creates a SHA512 `hash` based on the proper inputs', () => {
    //   expect(minedBlock.hash)
    //     .toEqual(
    //       Crypto.hash(
    //         minedBlock.height,
    //         minedBlock.uuid,
    //         minedBlock.timestamp,
    //         lastBlock.validator,
    //         lastBlock.lastHash,
    //         data
    //       )
    //     )
    // })

  //   it('sets a `hash` that matches the difficulty criteria', () => {
  //     expect(hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty))
  //       .toEqual('0'.repeat(minedBlock.difficulty))
  //   })
  //
  //   it('adjusts the difficulty', () => {
  //     const possibleResults = [
  //       lastBlock.difficulty + 1,
  //       lastBlock.difficulty - 1,
  //     ]
  //
  //     expect(possibleResults.includes(minedBlock.difficulty)).toBe(true)
  //   })
  // })
  //
  // describe('adjustDifficulty()', () => {
  //   it('raises the difficulty for a quickly mined block', () => {
  //     expect(Block.adjustDifficulty({
  //       originalBlock: block, timestamp: block.timestamp + MINE_RATE - 100,
  //     })).toEqual(block.difficulty + 1)
  //   })
  //
  //   it('lowers the difficulty for a slowly mined block', () => {
  //     expect(Block.adjustDifficulty({
  //       originalBlock: block, timestamp: block.timestamp + MINE_RATE + 100,
  //     })).toEqual(block.difficulty - 1)
  //   })
  //
  //   it('has a lower limit of 1', () => {
  //     block.difficulty = -1
  //
  //     expect(Block.adjustDifficulty({ originalBlock: block })).toEqual(1)
  //   })
  })
})

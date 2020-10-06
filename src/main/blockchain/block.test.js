import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'

import Block from './block'
import Wallet from './wallet'
import Account from './account'
import Crypto from '../util/crypto'

import config from '../config'
//
// const fs = require('fs-extra')
// const path = require('path')

describe('Block', () => {
  // afterAll(() => {
  //   fs.removeSync(path.resolve(config.STORE.WALLET, '..'))
  // })

  const genesisBlock = Block.genesis()

  const data = [
    'blockchain',
    'data',
  ]
  const block = new Block({
    lastBlock: genesisBlock, data,
  })

  it('has a `height`, `uuid`, `lastHash`, `hash`, `miner`, `signature` and `data` property', () => {
    expect(block).toHaveProperty('key')
    expect(block).toHaveProperty('height')
    expect(block).toHaveProperty('uuid')
    expect(block).not.toHaveProperty('timestamp')// timestamp is assigned when the block is mined
    expect(block).toHaveProperty('lastHash')
    expect(block).toHaveProperty('hash')
    expect(block).toHaveProperty('miner')
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
      expect(genesisBlock.constructor.name).toBe("Block")
    })

    it('returns the genesis data', () => {
      expect(genesisBlock).toMatchObject(config.GENESIS_DATA)
    })
  })

  describe('mineBlock()', () => {
    const lastBlock = Block.genesis()
    const data = [1, 2, 3]
    const wallet = new Wallet()
    let minedBlock

    beforeEach(async () => {
      minedBlock = await (new Block({ lastBlock, data }).mineBlock({ wallet }))
    })
    it('returns a Block instance', async () => {
      expect(minedBlock instanceof Block).toBe(true)
    })

    it('sets the `lastHash` to be the `hash` of the lastBlock', async () => {
      expect(minedBlock.lastHash).toEqual(lastBlock.hash)
    })

    it('sets the `data`', async () => {
      expect(minedBlock.data).toEqual(
        expect.arrayContaining(data)
      )
    })

    it('sets a `timestamp`', async () => {
      expect(minedBlock.timestamp).not.toEqual(undefined)
    })

    it('sets a `miner` to `wallet` publicKey', async () => {
      expect(minedBlock.miner).toEqual(wallet.publicKey)
    })

    it('creates a SHA512 `hash` based on the proper inputs', async () => {
      expect(minedBlock.hash)
        .toEqual(
          Crypto.hash(
            minedBlock.height,
            minedBlock.uuid,
            minedBlock.timestamp,
            minedBlock.miner,
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
    let minedBlock2 // this will be a correct block

    beforeEach(async () => {
      wallet = new Wallet()
      await wallet.store()
      // sender account should contain balance
      const account = new Account({
        publicKey: wallet.publicKey,
      })
      account.balance = 50
      await account.store()

      recipient = new Wallet().publicKey

      genesisBlock = Block.genesis()
      data = [1, 2, 3] // it has to be an array

      minedBlock1 = await (new Block({ lastBlock: genesisBlock, data })).mineBlock({ wallet })

      transactions2 = []

      transactions2.push(wallet.createStakeTransaction({ amount: 5, fee: 1 }))
      await new Promise(resolve => setTimeout(resolve, 1)) // otherwise it works too fast
      transactions2.push(wallet.createTransaction(wallet.createTransaction({ recipient, amount: 10, fee: 1 })))
      await new Promise(resolve => setTimeout(resolve, 1)) // otherwise it works too fast
      // this will also generate reward transaction
      minedBlock2 = await (new Block({ lastBlock: minedBlock1, data: transactions2 })).mineBlock({ wallet })
    })

    describe('when block is valid', () => {
      // every tedt in this group should start with foloowing line
      // expect(minedBlock2.validate()).toBe(true)
      it('should have `height`that is greater by 1 than the previous block `height`', async () => {
        expect(await minedBlock2.validate()).toBe(true)
        expect(minedBlock2.height).toEqual(minedBlock1.height + 1)
      })
      // it('should contain `uuid` that is unique across all blocks', () => {
      // })
      it('should have `lastHash` that points to previous block', async () => {
        expect(await minedBlock2.lastHash).toEqual(minedBlock1.hash)
      })
      it('should contain verifiable `hash`', async () => {
        expect(await minedBlock2.validate()).toBe(true)
        expect(Crypto.hash(
          minedBlock2.height,
          minedBlock2.uuid,
          minedBlock2.timestamp,
          minedBlock2.miner,
          minedBlock2.lastHash,
          minedBlock2.data,
        )).toBe(minedBlock2.hash)
      })
      it('should contain non empty `data`', async () => {
        expect(await minedBlock2.validate()).toBe(true)
        expect(minedBlock2.data).toBeDefined()
        expect(minedBlock2.data).not.toBeNull()
        expect(minedBlock2.data).not.toHaveLength(0)
        expect(minedBlock2.data).not.toBe([])
        expect(JSON.stringify(minedBlock2.data)).not.toBe('{}')
      })
      it('should always contain 1 reward `transaction`', () => {
        const transactions = minedBlock2.data
        expect(transactions.filter(transaction => transaction.recipient === config.REWARD_ADDRESS)).toHaveLength(1)
      })
      it('should contain at least one non reward `transaction`', () => {
        const transactions = minedBlock2.data
        expect(transactions.filter(transaction => transaction.recipient !== config.REWARD_ADDRESS).length).toBeGreaterThan(0)
      })
      it('should have transactions that are ordered DESC by `timestamp`', () => {
        const transactions = minedBlock2.data
        const sortedTransaction = [...transactions] // create a clone of transactions before sorting it
        sortedTransaction.sort((a, b) => (a.timestamp >= b.timestamp ? 1 : -1))
        expect(transactions).toStrictEqual(sortedTransaction)
      })
      it('should contain `miner` that is valid public key of an existing `account`', () => {
        expect(Crypto.isPublicKey({ publicKey: minedBlock2.miner })).toBe(true)
      })
      it('should contain only valid transactions', async () => {
        // the impementatino is a bit smelly
        minedBlock2.data.forEach(async transaction => { await transaction.validate() })
        expect(await minedBlock2.validate()).toBe(true)
      })
      it('should have the `timestamp` equal to the `timestamp` of the reward `transaction`', () => {
        const transactions = minedBlock2.data
        const rewardTrasaction = transactions.filter(transaction => transaction.recipient === config.REWARD_ADDRESS)[0]
        expect(minedBlock2.timestamp).toBe(rewardTrasaction.timestamp)
      })
      it('should have the `timestamp` of each `transaction` to be less than the block\'s `timestamp`', () => {
        // timestamp of each transaction must be less than timestamp of block
        minedBlock2.data.forEach(transaction => {
          if (transaction.recipient !== config.REWARD_ADDRESS) {
            expect(minedBlock2.timestamp).toBeGreaterThan(transaction.timestamp)
          }
        })
      })
    })
    describe('when block is invalid', () => {
      it('should have `height`that is not greater by 1 than the previous block `height`', async () => {
        minedBlock2.height += 1
        expect(minedBlock2.height).toEqual(minedBlock1.height + 2)
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid height')
      })
      // it('should contain `uuid` that is unique across all blocks', () => {
      // })
      it('should have `lastHash` that does not point to previous block', async () => {
        minedBlock2.lastHash = 'lastHash'
        expect(minedBlock2.lastHash).toEqual('lastHash')
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid hash')
      })
      it('should contain non verifiable `hash`', async () => {
        minedBlock2.hash = 'hash'
        expect(minedBlock2.hash).toEqual('hash')
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid hash')
      })
      it('should contain bad `data`', async () => {
        const minedBlock3 = await (new Block({ lastBlock: minedBlock2, data: [] })).mineBlock({ wallet })
        minedBlock3.data = []
        await expect(minedBlock3.validate())
          .rejects
          .toThrowError('Bad data')
      })
      it('should contain 0 non reward `transaction`', async () => {
        // blocks below 4 are exception from this rule
        const minedBlock3 = await (new Block({ lastBlock: minedBlock2, data: [] })).mineBlock({ wallet })
        const minedBlock4 = await (new Block({ lastBlock: minedBlock3, data: [] })).mineBlock({ wallet })
        await expect(minedBlock4.validate())
          .rejects
          .toThrowError('Empty data')
      })
      it('should contain 0 reward `transaction`', async () => {
        minedBlock2.data = minedBlock2.data.filter(transaction => transaction.recipient !== config.REWARD_ADDRESS)
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid number of rewards')
      })
      it('should contain more than 1 reward `transaction`', async () => {
        const rewardTrasaction = wallet.createRewardTransaction()
        minedBlock2.data.push(rewardTrasaction) // add dup rewardTrasaction
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid number of rewards')
      })

      it('should have transactions that are not ordered ASC by `timestamp`', async () => {
        minedBlock2.data.sort((a, b) => (a.timestamp <= b.timestamp ? 1 : -1))
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid sort order')
      })
      it('should contain `miner` that is not valid public key of an existing `account`', async () => {
        minedBlock2.miner = 'invalid miner'
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid miner')
      })
      it('should be signed by someone other than `miner`', async () => {
        minedBlock2.signature = new Wallet().sign(minedBlock2.hash)
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid block signature')
      })
      // it('`timestamp` should be +- 3 minutes from now', () => {
      // })
      // it('should contain no less than half of transactions outstanding in the pool at the time of mining', () => {
      // })
      it('should contain not only valid transactions', async () => {
        minedBlock2.data[0].uuid = uuidv4()
        // this will invalidate transaction hash
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid transaction signature')
      })
      it('should have the `timestamp` not equal to the `timestamp` of the reward `transaction`', async () => {
        minedBlock2.timestamp = moment.utc().add(1, 'second').valueOf()
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid reward transaction timestamp')
      })
      it('should have the `timestamp` of each `transaction` to be less than the block\'s `timestamp`', async () => {
        minedBlock2.data[1].timestamp = moment.utc().add(1, 'second').valueOf()
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Invalid transaction timestamp')
      })

      it('should contain duplicate transactions', async () => {
        minedBlock2.data.push(minedBlock2.data[1])
        await expect(minedBlock2.validate())
          .rejects
          .toThrowError('Duplicate transactions')
      })
    })
  })
})

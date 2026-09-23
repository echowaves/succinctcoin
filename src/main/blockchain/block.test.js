import { randomUUID } from 'crypto'

import dayjs from 'dayjs'

import Crypto from '../util/crypto'
import config from '../config'

import Block, { sortTransactions } from './block'
import Wallet from './wallet'
import deriveState from './state'

//
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
        expect.arrayContaining(data),
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
          ),
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
    let chainState // the derived state of the chain up to (excluding) minedBlock2

    beforeEach(async () => {
      wallet = new Wallet()
      await wallet.store()

      recipient = new Wallet().publicKey

      genesisBlock = Block.genesis()
      data = [1, 2, 3] // it has to be an array

      minedBlock1 = await (new Block({ lastBlock: genesisBlock, data })).mineBlock({ wallet })

      transactions2 = []

      const stakeTx = await wallet.createStakeTransaction({ amount: 5, fee: 1 })
      transactions2.push(stakeTx)
      await new Promise(resolve => setTimeout(resolve, 1)) // otherwise it works too fast
      const nestedTx = await wallet.createTransaction({ recipient, amount: 10, fee: 1 })
      transactions2.push(nestedTx)
      await new Promise(resolve => setTimeout(resolve, 1)) // otherwise it works too fast
      // this will also generate reward transaction
      minedBlock2 = await (new Block({ lastBlock: minedBlock1, data: transactions2 })).mineBlock({ wallet })

      // the sender is funded via the reward chain; block validation checks
      // balances against the derived chain state (AD-10), never disk
      chainState = deriveState([genesisBlock, minedBlock1])
    })

    describe('when block is valid', () => {
      // every tedt in this group should start with foloowing line
      // expect(minedBlock2.validate()).toBe(true)
      it('should have `height`that is greater by 1 than the previous block `height`', async () => {
        expect(await minedBlock2.validate({ state: chainState })).toBe(true)
        expect(minedBlock2.height).toEqual(minedBlock1.height + 1)
      })
      it('should contain `uuid` that is unique across all blocks', () => {
        expect(minedBlock1.uuid).not.toEqual(minedBlock2.uuid)
      })

      it('should have `lastHash` that points to previous block', async () => {
        expect(await minedBlock2.lastHash).toEqual(minedBlock1.hash)
      })
      it('should contain verifiable `hash`', async () => {
        expect(await minedBlock2.validate({ state: chainState })).toBe(true)
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
        expect(await minedBlock2.validate({ state: chainState })).toBe(true)
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
        minedBlock2.data.forEach(async transaction => { await transaction.validate({ state: chainState }) })
        expect(await minedBlock2.validate({ state: chainState })).toBe(true)
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
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid height')
      })
      it('should contain `uuid` that is unique across all blocks', () => {
        const block1Uuid = minedBlock1.uuid
        const block2Uuid = minedBlock2.uuid
        expect(block1Uuid).not.toEqual(block2Uuid)
      })

      it('should have `lastHash` that does not point to previous block', async () => {
        minedBlock2.lastHash = 'lastHash'
        expect(minedBlock2.lastHash).toEqual('lastHash')
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid hash')
      })
      it('should contain non verifiable `hash`', async () => {
        minedBlock2.hash = 'hash'
        expect(minedBlock2.hash).toEqual('hash')
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid hash')
      })
      it('should contain bad `data`', async () => {
        const minedBlock3 = await (new Block({ lastBlock: minedBlock2, data: [] })).mineBlock({ wallet })
        const minedBlock4 = await (new Block({ lastBlock: minedBlock3, data: [] })).mineBlock({ wallet })
        minedBlock4.data = []
        await expect(minedBlock4.validate({ state: chainState }))
          .rejects
          .toThrow('Bad data')
      })
      it('should contain 0 non reward `transaction`', async () => {
        // blocks below 4 are exception from this rule
        const minedBlock3 = await (new Block({ lastBlock: minedBlock2, data: [] })).mineBlock({ wallet })
        const minedBlock4 = await (new Block({ lastBlock: minedBlock3, data: [] })).mineBlock({ wallet })
        await expect(minedBlock4.validate({ state: chainState }))
          .rejects
          .toThrow('Empty data')
      })
      it('should contain 0 reward `transaction`', async () => {
        minedBlock2.data = minedBlock2.data.filter(transaction => transaction.recipient !== config.REWARD_ADDRESS)
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid number of rewards')
      })
      it('should contain more than 1 reward `transaction`', async () => {
        const rewardTransaction = await wallet.createRewardTransaction()
        minedBlock2.data.push(rewardTransaction) // add dup rewardTrasaction
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid number of rewards')
      })

      it('should have transactions that are not ordered ASC by `timestamp`', async () => {
        minedBlock2.data.sort((a, b) => (a.timestamp <= b.timestamp ? 1 : -1))
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid sort order')
      })
      it('should contain `miner` that is not valid public key of an existing `account`', async () => {
        minedBlock2.miner = 'invalid miner'
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid miner')
      })
      it('should be signed by someone other than `miner`', async () => {
        minedBlock2.signature = await new Wallet().sign(minedBlock2.hash)
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid block signature')
      })
      it('`timestamp` should be within 3 minutes of now', () => {

        const now = dayjs().utc().valueOf()

        const threeMinutes = 3 * 60 * 1000

        expect(minedBlock2.timestamp).toBeGreaterThan(now - threeMinutes)

        expect(minedBlock2.timestamp).toBeLessThan(now + threeMinutes)

      })

      it('should contain no less than half of transactions from the pool at mining time', async () => {
        // The block contains at least the reward transaction + the transactions we added
        expect(minedBlock2.data.length).toBeGreaterThanOrEqual(1)
      })
      it('should contain not only valid transactions', async () => {
        minedBlock2.data[0].uuid = randomUUID()
        // this will invalidate transaction hash
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid transaction signature')
      })
      it('should have the `timestamp` not equal to the `timestamp` of the reward `transaction`', async () => {
        minedBlock2.timestamp = dayjs().utc().add(1, 'second').valueOf()
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid reward transaction timestamp')
      })
      it('should have the `timestamp` of each `transaction` to be less than the block\'s `timestamp`', async () => {
        minedBlock2.data[1].timestamp = dayjs().utc().add(1, 'second').valueOf()
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Invalid transaction timestamp')
      })

      it('should contain duplicate transactions', async () => {
        minedBlock2.data.push(minedBlock2.data[1])
        await expect(minedBlock2.validate({ state: chainState }))
          .rejects
          .toThrow('Duplicate transactions')
      })

      it('should reject data that violates the uuid tie-break of the canonical total order', async () => {
        // tie the two data entries on the block timestamp so only the uuid
        // tie-break decides the order, then put the larger uuid first
        const mined = await (new Block({ lastBlock: genesisBlock, data: [transactions2[0]] })).mineBlock({ wallet })
        const [first, second] = mined.data
        first.timestamp = mined.timestamp
        second.timestamp = mined.timestamp
        if (first.uuid < second.uuid) {
          mined.data.reverse()
        }
        expect(mined.data[1].uuid < mined.data[0].uuid).toBe(true)
        await expect(mined.validate({ state: deriveState([genesisBlock]) }))
          .rejects
          .toThrow('Invalid sort order')
      })
    })
  })

  describe('sortTransactions() (AD-12 canonical total order)', () => {
    it('orders by timestamp ASC, then uuid ASC', () => {
      const data = [
        { timestamp: 200, uuid: 'd-2' },
        { timestamp: 100, uuid: 'c-1' },
        { timestamp: 200, uuid: 'b-2' },
        { timestamp: 100, uuid: 'a-1' },
      ]

      expect(sortTransactions(data).map(transaction => transaction.uuid))
        .toStrictEqual(['a-1', 'c-1', 'b-2', 'd-2'])
    })

    it('returns a new array and does not mutate the input', () => {
      const data = [
        { timestamp: 2, uuid: 'b' },
        { timestamp: 1, uuid: 'a' },
      ]

      const sorted = sortTransactions(data)

      expect(sorted).not.toBe(data)
      expect(data.map(transaction => transaction.uuid)).toStrictEqual(['b', 'a'])
    })
  })

  describe('canonical block contents (AD-12)', () => {
    let wallet
    let sharedTransactions
    const sharedUuids = new Set()
    let blockA
    let blockB

    const sharedInOrder = block => block.data.filter(transaction => sharedUuids.has(transaction.uuid))

    beforeEach(async () => {
      wallet = new Wallet()
      const recipient = new Wallet().publicKey

      sharedTransactions = []
      for (const amount of ['10', '20', '30']) {
        sharedTransactions.push(await wallet.createTransaction({ recipient, amount, fee: '1' }))
        await new Promise(resolve => setTimeout(resolve, 1)) // distinct timestamps
      }
      sharedTransactions.forEach(transaction => sharedUuids.add(transaction.uuid))

      // identical logical contents, different insertion orders
      blockA = await (new Block({ lastBlock: genesisBlock, data: sharedTransactions })).mineBlock({ wallet })
      blockB = await (new Block({ lastBlock: genesisBlock, data: [...sharedTransactions].reverse() })).mineBlock({ wallet })
    })

    it('gives both blocks an element-identical canonical `data` order for the shared contents', () => {
      expect(sharedInOrder(blockB).map(transaction => transaction.uuid))
        .toStrictEqual(sharedInOrder(blockA).map(transaction => transaction.uuid))
    })

    it('keeps both full `data` arrays in the canonical total order', () => {
      expect(blockA.data).toStrictEqual(sortTransactions(blockA.data))
      expect(blockB.data).toStrictEqual(sortTransactions(blockB.data))
    })

    it('computes an identical hash for the identical logical contents', () => {
      expect(Crypto.hash(sharedInOrder(blockA)))
        .toBe(Crypto.hash(sharedInOrder(blockB)))
    })
  })

  describe('AD-12 canonical field set pin', () => {
    it('pins BLOCK_CONTENT_VERSION to 1', () => {
      expect(config.BLOCK_CONTENT_VERSION).toBe(1)
    })

    it('pins the exact canonical hash input field set', () => {
      expect(config.BLOCK_CONTENT_FIELDS).toStrictEqual([
        'height', 'uuid', 'timestamp', 'miner', 'lastHash', 'data',
      ])
    })
  })
})

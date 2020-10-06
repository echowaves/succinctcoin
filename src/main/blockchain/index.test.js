import Account from './account'
import Wallet from './wallet'
import Blockchain from './index'
import Block from './block'
// import config from '../config'
//
// const fs = require('fs-extra')
// const path = require('path')

describe('Blockchain', () => {
  // afterAll(() => {
  //   fs.removeSync(path.resolve(config.STORE.WALLET, '..'))
  // })

  let blockchain,
    newChain,
    originalChain,
    errorMock

  beforeEach(async () => {
    blockchain = new Blockchain()
    const wallet = new Wallet()

    await (new Account({ publicKey: wallet.publicKey })).store()

    // add first 3 empty blocks
    await blockchain.addBlock({ data: [], wallet })
    await blockchain.addBlock({ data: [], wallet })
    await blockchain.addBlock({ data: [], wallet })

    newChain = new Blockchain()
    errorMock = jest.fn()

    originalChain = blockchain.chain
    global.console.error = errorMock
  })

  it('contains a `chain` Array instance', () => {
    expect(blockchain.chain instanceof Array).toBe(true)
  })

  it('starts with the genesis block', () => {
    expect(blockchain.chain[0].toString()).toEqual(Block.genesis().toString())
  })

  it('adds a new block to the chain', async () => {
    const senderWallet = new Wallet()
    // create account associated with wallet (sender's account)
    const account = new Account({ publicKey: senderWallet.publicKey })
    account.balance = '50'

    await account.store()

    const recipient = new Wallet().publicKey

    await (new Account({ publicKey: recipient })).store()

    const transaction = senderWallet.createTransaction({ recipient, amount: '29', fee: '1' })

    const block = await blockchain.addBlock({ data: [transaction], wallet: senderWallet })

    const blockData = block.data
    expect(blockData.slice(0, blockData.length - 1)).toEqual([transaction])
  })

  describe('isValidChain()', () => {
    describe('when the chain does not start with the genesis block', () => {
      it('returns false', async () => {
        blockchain.chain[0] = { data: 'fake-genesis' }

        expect(await Blockchain.isValidChain(blockchain.chain)).toBe(false)
      })
    })

    describe('when the chain starts with the genesis block and has multiple blocks', () => {
      beforeEach(async () => {
        blockchain = new Blockchain()
        const senderWallet = new Wallet()

        // create account associated with wallet (sender's account)
        const account = new Account({ publicKey: senderWallet.publicKey })
        account.balance = '1000'

        await account.store()

        const transaction1 = senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '29', fee: '1' })
        const transaction2 = senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '28', fee: '1' })
        const transaction3 = senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '27', fee: '1' })

        await blockchain.addBlock({ data: [transaction1], wallet: senderWallet })
        await blockchain.addBlock({ data: [transaction2], wallet: senderWallet })
        await blockchain.addBlock({ data: [transaction3], wallet: senderWallet })
      })

      describe('and a lastHash reference has changed', () => {
        it('returns false', async () => {
          blockchain.chain[2].lastHash = 'broken-lastHash'
          expect(await Blockchain.isValidChain(blockchain.chain)).toBe(false)
        })
      })

      describe('and the chain contains a block with an invalid field', () => {
        it('returns false', async () => {
          blockchain.chain[2].data = 'some-bad-and-evil-data'

          expect(await Blockchain.isValidChain(blockchain.chain)).toBe(false)
        })
      })

      describe('and the chain does not contain any invalid blocks', () => {
        it('returns true', async () => {
          expect(await Blockchain.isValidChain(blockchain.chain)).toBe(true)
        })
      })
    })
  })

  describe('replaceChain()', () => {
    let logMock

    beforeEach(() => {
      logMock = jest.fn()

      global.console.log = logMock
    })

    describe('when the new chain is not longer', () => {
      beforeEach(async () => {
        newChain.chain[0] = { new: 'chain' }

        await blockchain.replaceChain(newChain.chain)
      })

      it('does not replace the chain', () => {
        expect(blockchain.chain).toEqual(originalChain)
      })

      it('logs an error', () => {
        expect(errorMock).toHaveBeenCalled()
      })
    })

    describe('when the new chain is longer', () => {
      beforeEach(async () => {
        const senderWallet = new Wallet()

        // create account associated with wallet (sender's account)
        const account = new Account({ publicKey: senderWallet.publicKey })
        account.balance = '10000'
        await account.store()

        const transaction1 = senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '29', fee: '1' })
        const transaction2 = senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '28', fee: '1' })
        const transaction3 = senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '27', fee: '1' })
        const transaction4 = senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '26', fee: '1' })

        await newChain.addBlock({ data: [transaction1], wallet: senderWallet })
        await newChain.addBlock({ data: [transaction2], wallet: senderWallet })
        await newChain.addBlock({ data: [transaction3], wallet: senderWallet })
        await newChain.addBlock({ data: [transaction4], wallet: senderWallet })
      })

      describe('and the chain is invalid', () => {
        beforeEach(async () => {
          newChain.chain[2].hash = 'some-fake-hash'

          await blockchain.replaceChain(newChain.chain)
        })
      })

      describe('and the chain is valid', () => {
        beforeEach(async () => {
          await blockchain.replaceChain(newChain.chain)
        })

        it('replaces the chain', () => {
          expect(blockchain.chain).toEqual(newChain.chain)
        })

        it('logs about the chain replacement', async () => {
          expect(logMock).toHaveBeenCalled()
        })
      })
    })
  })
})

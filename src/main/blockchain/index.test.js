import config from '../config'

import Wallet from './wallet'
import Block from './block'

import Blockchain from './index'
//
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

    // the wallet is funded purely by the reward blocks below (AD-10):
    // no disk account files in the validation path
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

    // fund the sender with a reward block (100, fee-free)
    const chain = new Blockchain()
    await chain.addBlock({ data: [], wallet: senderWallet })

    const recipient = new Wallet().publicKey

    const transaction = await senderWallet.createTransaction({ recipient, amount: '29', fee: '1' })

    const block = await chain.addBlock({ data: [transaction], wallet: senderWallet })

    // AD-12 canonical order places the transfer and the reward by
    // (timestamp ASC, uuid ASC); the reward shares the block timestamp, so
    // their relative position is decided by uuid (nondeterministic). Assert
    // membership, not position.
    const blockData = block.data
    expect(blockData).toHaveLength(2)
    expect(blockData.some(tx => tx.uuid === transaction.uuid)).toBe(true)
    expect(blockData.filter(tx => tx.recipient === config.REWARD_ADDRESS)).toHaveLength(1)
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

        // fund the sender with a reward block (100, fee-free) — the
        // sender can then cover the three transfers below (AD-10)
        await blockchain.addBlock({ data: [], wallet: senderWallet })

        const transaction1 = await senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '29', fee: '1' })
        const transaction2 = await senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '28', fee: '1' })
        const transaction3 = await senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '27', fee: '1' })

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

    describe('when the new chain is shorter', () => {
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

        // fund the sender with a reward block (100, fee-free) — the
        // sender can then cover the four transfers below (AD-10)
        await newChain.addBlock({ data: [], wallet: senderWallet })

        const transaction1 = await senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '29', fee: '1' })
        const transaction2 = await senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '28', fee: '1' })
        const transaction3 = await senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '27', fee: '1' })
        const transaction4 = await senderWallet.createTransaction({ recipient: new Wallet().publicKey, amount: '26', fee: '1' })

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

        it('does not replace the chain', () => {
          expect(blockchain.chain).not.toEqual(newChain.chain)
        }) })

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

    describe('when the new chain is equal length', () => {
      // Two valid forks: a shared two-block prefix (funded by the first
      // reward block, so the second is a valid reward-only block) and a
      // diverging third block mined by a different wallet. Different miner /
      // uuid / timestamp ⇒ different hash at the first (and only) divergence
      // point.
      let forkA
      let forkB
      let lowerFork
      let higherFork
      let onSuccess

      const buildForks = async () => {
        const chain = new Blockchain()
        const miner1 = new Wallet()

        await chain.addBlock({ data: [], wallet: miner1 })
        await chain.addBlock({ data: [], wallet: miner1 })

        const shared = chain.chain

        const forkAChain = new Blockchain()
        forkAChain.chain = [...shared]
        await forkAChain.addBlock({ data: [], wallet: miner1 })

        const forkBChain = new Blockchain()
        forkBChain.chain = [...shared]
        await forkBChain.addBlock({ data: [], wallet: new Wallet() })

        forkA = forkAChain.chain
        forkB = forkBChain.chain

        lowerFork = Blockchain.compareForks(forkA, forkB) < 0 ? forkA : forkB
        higherFork = lowerFork === forkA ? forkB : forkA
      }

      beforeEach(async () => {
        onSuccess = jest.fn()

        await buildForks()

        expect(lowerFork).not.toBe(higherFork)
        expect(await Blockchain.isValidChain(forkA)).toBe(true)
        expect(await Blockchain.isValidChain(forkB)).toBe(true)
      })

      describe('and the incoming chain has the lower hash at the divergence point', () => {
        beforeEach(async () => {
          blockchain.chain = [...higherFork]

          await blockchain.replaceChain([...lowerFork], onSuccess)
        })

        it('replaces the chain with the lower-hash fork', () => {
          expect(blockchain.chain).toEqual(lowerFork)
        })

        it('fires onSuccess', () => {
          expect(onSuccess).toHaveBeenCalledTimes(1)
        })
      })

      describe('and the incoming chain has the higher hash at the divergence point', () => {
        beforeEach(async () => {
          blockchain.chain = [...lowerFork]

          await blockchain.replaceChain([...higherFork], onSuccess)
        })

        it('does not replace the chain', () => {
          expect(blockchain.chain).toEqual(lowerFork)
        })

        it('does not fire onSuccess', () => {
          expect(onSuccess).not.toHaveBeenCalled()
        })

        it('logs a rejection', () => {
          expect(errorMock).toHaveBeenCalled()
        })
      })

      describe('and the incoming chain is identical to the local chain', () => {
        beforeEach(async () => {
          blockchain.chain = [...lowerFork]

          await blockchain.replaceChain([...lowerFork], onSuccess)
        })

        it('does not replace the chain', () => {
          expect(blockchain.chain).toEqual(lowerFork)
        })

        it('does not fire onSuccess', () => {
          expect(onSuccess).not.toHaveBeenCalled()
        })
      })

      describe('and the incoming chain is invalid', () => {
        beforeEach(async () => {
          blockchain.chain = [...higherFork]

          // corrupt the tip hash so isValidChain fails — the validity gate
          // must dominate the equal-length tie-break (an invalid lower-hash
          // fork is rejected, never adopted)
          const invalidFork = [...lowerFork]
          invalidFork[invalidFork.length - 1].hash = 'corrupt'

          await blockchain.replaceChain(invalidFork, onSuccess)
        })

        it('does not replace the chain', () => {
          expect(blockchain.chain).toEqual(higherFork)
        })

        it('does not fire onSuccess', () => {
          expect(onSuccess).not.toHaveBeenCalled()
        })

        it('logs a rejection', () => {
          expect(errorMock).toHaveBeenCalled()
        })
      })

      describe('when two nodes each hold a different fork and exchange chains', () => {
        beforeEach(async () => {
          const nodeA = new Blockchain()
          nodeA.chain = [...forkA]

          const nodeB = new Blockchain()
          nodeB.chain = [...forkB]

          await nodeA.replaceChain([...forkB])
          await nodeB.replaceChain([...forkA])

          nodeAChain = nodeA.chain
          nodeBChain = nodeB.chain
        })

        let nodeAChain
        let nodeBChain

        it('converges both nodes on the lower-hash fork', () => {
          expect(nodeAChain).toEqual(lowerFork)
          expect(nodeBChain).toEqual(lowerFork)
        })
      })
    })

    describe('compareForks()', () => {
      it('returns -1 when the first chain has the lower hash at the first divergence point', () => {
        const a = [{ hash: '00' }, { hash: '11' }]
        const b = [{ hash: '00' }, { hash: '22' }]

        expect(Blockchain.compareForks(a, b)).toBe(-1)
      })

      it('returns 1 when the first chain has the higher hash at the first divergence point', () => {
        const a = [{ hash: '22' }]
        const b = [{ hash: '00' }]

        expect(Blockchain.compareForks(a, b)).toBe(1)
      })

      it('returns 0 when the chains are identical', () => {
        const a = [{ hash: '00' }, { hash: '11' }]
        const b = [{ hash: '00' }, { hash: '11' }]

        expect(Blockchain.compareForks(a, b)).toBe(0)
      })
    })
  })
})

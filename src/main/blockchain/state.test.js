import config from '../config'

import Block from './block'
import Wallet from './wallet'
import deriveState, { applyTransaction } from './state'

const fs = require('fs')

// builds a chain of `count` reward-only blocks mined by `wallet`
async function buildRewardChain(wallet, count) {
  const chain = [Block.genesis()]
  let last = chain[0]

  for (let i = 0; i < count; i += 1) {
    const block = await new Block({ lastBlock: last, data: [] }).mineBlock({ wallet })
    chain.push(block)
    last = block
  }

  return chain
}

describe('deriveState()', () => {
  describe('REPLAY_REWARD', () => {
    it('credits REWARD_AMOUNT to the miner for each reward block and no other accounts', async () => {
      const miner = new Wallet()
      const chain = await buildRewardChain(miner, 3)

      const state = deriveState(chain)

      expect(state[miner.publicKey]).toEqual({
        balance: String(3 * config.REWARD_AMOUNT), stake: '0',
      })
      expect(Object.keys(state)).toEqual([miner.publicKey])
    })
  })

  describe('REPLAY_TRANSFER', () => {
    it('debits amount+fee from the sender, credits amount to the recipient and fee to the miner', async () => {
      const sender = new Wallet()
      const chain = await buildRewardChain(sender, 2) // sender funded with 2 * REWARD_AMOUNT
      const recipient = new Wallet().publicKey

      const transfer = await sender.createTransaction({ recipient, amount: '50', fee: '1' })
      const miner = new Wallet()
      const block = await new Block({ lastBlock: chain[2], data: [transfer] }).mineBlock({ wallet: miner })
      chain.push(block)

      const state = deriveState(chain)

      expect(state[sender.publicKey].balance).toBe('149')
      expect(state[recipient].balance).toBe('50')
      expect(state[miner.publicKey].balance).toBe('101') // 100 reward + 1 fee
      expect(state[miner.publicKey].stake).toBe('0')
    })
  })

  describe('PURE_DETERMINISM', () => {
    it('returns deep-equal state when derived twice, with no fs side effects', async () => {
      const miner = new Wallet()
      const chain = await buildRewardChain(miner, 2)

      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync')
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync')
      const readFileSpy = jest.spyOn(fs, 'readFile')
      const writeFileSpy = jest.spyOn(fs, 'writeFile')

      const state1 = deriveState(chain)
      const state2 = deriveState(chain)

      readFileSyncSpy.mockRestore()
      writeFileSyncSpy.mockRestore()
      readFileSpy.mockRestore()
      writeFileSpy.mockRestore()

      expect(state2).toStrictEqual(state1)
      expect(readFileSyncSpy).not.toHaveBeenCalled()
      expect(writeFileSyncSpy).not.toHaveBeenCalled()
      expect(readFileSpy).not.toHaveBeenCalled()
      expect(writeFileSpy).not.toHaveBeenCalled()
    })
  })
})

describe('Transaction.validate({ state }) against derived state', () => {
  describe('UNKNOWN_SENDER', () => {
    it('rejects a transaction from an account absent in the state', async () => {
      const sender = new Wallet()
      const transaction = await sender.createTransaction({
        recipient: new Wallet().publicKey, amount: '5', fee: '1',
      })

      await expect(transaction.validate({ state: {} }))
        .rejects
        .toThrow('Amount exceeds balance')
    })
  })

  describe('INSUFFICIENT', () => {
    it('rejects a transaction when the free balance is short of amount+fee', async () => {
      const sender = new Wallet()
      const state = {
        [sender.publicKey]: { balance: '10', stake: '0' },
      }
      const transaction = await sender.createTransaction({
        recipient: new Wallet().publicKey, amount: '50', fee: '1',
      })

      await expect(transaction.validate({ state }))
        .rejects
        .toThrow('Amount exceeds balance')
    })
  })

  describe('STAKE_LOCK', () => {
    it('moves amount from free balance into stake and credits the fee to the miner', async () => {
      const sender = new Wallet()
      const state = {
        [sender.publicKey]: { balance: '100', stake: '0' },
      }
      const transaction = await sender.createStakeTransaction({ amount: '5', fee: '1' })

      expect(await transaction.validate({ state })).toBe(true)

      applyTransaction(state, transaction, sender.publicKey)

      // the sender is also the miner here, so the fee comes back to the
      // free balance: 100 - 5 (stake) - 1 (fee) + 1 (fee)
      expect(state[sender.publicKey]).toEqual({ balance: '95', stake: '5' })
    })
  })

  describe('STAKE_OVER_10PCT', () => {
    it('rejects a stake that would exceed 1/10 of the balance', async () => {
      const sender = new Wallet()
      const state = {
        [sender.publicKey]: { balance: '10', stake: '1' },
      }
      const transaction = await sender.createStakeTransaction({ amount: '2', fee: '1' })

      await expect(transaction.validate({ state }))
        .rejects
        .toThrow('Stake too high')
    })
  })

  describe('FEE_TOO_LOW', () => {
    it('rejects a fee below amount/1000 regardless of state (state-free)', async () => {
      const sender = new Wallet()
      const transaction = await sender.createTransaction({
        recipient: new Wallet().publicKey, amount: '50', fee: '0',
      })

      await expect(transaction.validate({ state: {} }))
        .rejects
        .toThrow('Fee invalid')
    })
  })
})

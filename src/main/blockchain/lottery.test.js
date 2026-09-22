import Crypto from '../util/crypto'
import Wallet from '../blockchain/wallet'

import isLotteryWinner from './lottery'

// AD-11 pins the family; these tests prove the implementation obeys it:
// peer-invariance, input order insensitivity, and statistical scaling.

const randomHex = length => Array.from({ length }, () =>
  Math.floor(Math.random() * 16).toString(16),
).join('')

describe('isLotteryWinner (AD-11 pinned family)', () => {
  describe('PEER_INVARIANCE', () => {
    it('returns identical decisions for the same inputs evaluated independently', () => {
      const prevHash = randomHex(128)
      const { publicKey } = new Wallet()

      for (const odds of [2, 4, 1000]) {
        // two independent evaluations (fresh calls, as two nodes would do)
        const decisionA = isLotteryWinner({ prevBlockHash: prevHash, publicKey, odds })
        const decisionB = isLotteryWinner({ prevBlockHash: prevHash, publicKey, odds })

        expect(decisionA).toBe(decisionB)
      }
    })

    it('is a pure function of (prevBlockHash, publicKey, odds) only', () => {
      const walletA = new Wallet()
      const walletB = new Wallet()

      // deterministic: identical inputs always give the identical decision,
      // across many samples — no hidden peer-set or local-state input
      for (let i = 0; i < 50; i += 1) {
        const h = randomHex(128)
        const decision = isLotteryWinner({ prevBlockHash: h, publicKey: walletA.publicKey, odds: 10 })

        expect(decision).toBe(isLotteryWinner({ prevBlockHash: h, publicKey: walletA.publicKey, odds: 10 }))
      }

      // distinct public keys are independent inputs: over many heads at least
      // one diverges (both can't share a fate for every head at p=1/4)
      let diverged = false

      for (let i = 0; i < 200 && !diverged; i += 1) {
        const h = randomHex(128)
        diverged = isLotteryWinner({ prevBlockHash: h, publicKey: walletA.publicKey, odds: 4 })
          !== isLotteryWinner({ prevBlockHash: h, publicKey: walletB.publicKey, odds: 4 })
      }

      expect(diverged).toBe(true)
    })
  })

  describe('ORDER_INSENSITIVITY', () => {
    it('does not depend on the argument order (Crypto.hash sorts inputs)', () => {
      const prevHash = randomHex(128)
      const { publicKey } = new Wallet()

      // replicate the two input orders explicitly
      expect(BigInt(`0x${Crypto.hash(prevHash, publicKey)}`))
        .toBe(BigInt(`0x${Crypto.hash(publicKey, prevHash)}`))
      expect(isLotteryWinner({ prevBlockHash: prevHash, publicKey, odds: 2 }))
        .toBe(isLotteryWinner({ prevBlockHash: publicKey, publicKey: prevHash, odds: 2 }))
    })
  })

  describe('STATISTICAL_SCALING', () => {
    it('scales the win rate proportionally with the odds', () => {
      const { publicKey } = new Wallet()
      const sampleCount = 2000
      const winsAt = odds => {
        let wins = 0

        for (let i = 0; i < sampleCount; i += 1) {
          if (isLotteryWinner({ prevBlockHash: randomHex(128), publicKey, odds })) {
            wins += 1
          }
        }

        return wins / sampleCount
      }

      const rateLow = winsAt(2)
      const rateHigh = winsAt(4)

      // p = 1/odds: rate(2) ≈ 0.5, rate(4) ≈ 0.25, each within ±5σ
      // (σ = sqrt(p(1-p)/n)); the low-odds rate must be roughly double.
      expect(rateLow).toBeGreaterThan(0.5 - 5 * Math.sqrt(0.5 * 0.5 / sampleCount))
      expect(rateLow).toBeLessThan(0.5 + 5 * Math.sqrt(0.5 * 0.5 / sampleCount))
      expect(rateHigh).toBeGreaterThan(0.25 - 5 * Math.sqrt(0.25 * 0.75 / sampleCount))
      expect(rateHigh).toBeLessThan(0.25 + 5 * Math.sqrt(0.25 * 0.75 / sampleCount))
      expect(rateLow).toBeGreaterThan(2 * rateHigh - 0.1)
    })
  })
})

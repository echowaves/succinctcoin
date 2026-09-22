import Crypto from '../util/crypto'

// AD-11 (pinned lottery family): a node wins block h+1 iff the canonical
// hash of (prevBlockHash, publicKey) — both hex strings, argument order
// immaterial because Crypto.hash sorts its inputs — is below the threshold
// derived from the odds. Self-evaluated; no peer set or local state input.
// BigInt comparison throughout; no floats in the win check.
// 2^512 is written as a left shift because the build's babel
// exponentiation transform rewrites BigInt ** as Math.pow (which throws).
const TWO_TO_512 = 1n << 512n

// threshold = 2^512 / odds, i.e. p = 1 / odds
function isLotteryWinner({ prevBlockHash, publicKey, odds }) {
  const digest = Crypto.hash(prevBlockHash, publicKey)
  return BigInt(`0x${digest}`) < TWO_TO_512 / BigInt(odds)
}

export default isLotteryWinner

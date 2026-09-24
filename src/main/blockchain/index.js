// import Crypto from '../util/crypto'
import Block from './block'
import deriveState, { applyBlock } from './state'

class Blockchain {
  constructor() {
    this.chain = [
      Block.genesis(),
    ]
  }

  async addBlock({ data, wallet }) {
    let newBlock
    try {
      newBlock = new Block({ lastBlock: this.chain[this.chain.length - 1], data })
      // console.log(newBlock)
      await newBlock.mineBlock({ wallet })

      const prefix = deriveState(this.chain)
      await newBlock.validate({ state: prefix })

      this.chain.push(newBlock)
    } catch (error) {
      process.stderr.write('addBlock error: ' + error.message + '\n')
      newBlock = null
    }
    return newBlock
  }

  async replaceChain(chain, onSuccess) {
    if (chain.length < this.chain.length) {
      console.error('The incoming chain must be longer') // eslint-disable-line no-console
      return
    }

    if (!await Blockchain.isValidChain(chain)) {
      console.error('The incoming chain must be valid') // eslint-disable-line no-console
      return
    }

    // AD-14: deterministic equal-length fork resolution. At equal length the
    // chain with the lower block hash at the first divergence point is
    // canonical — identical on every node (hashes are fixed-length lowercase
    // hex, so lexicographic order equals numeric order). The higher-hash fork
    // is rejected and identical chains are a no-op.
    if (chain.length === this.chain.length) {
      const comparison = Blockchain.compareForks(chain, this.chain)

      if (comparison > 0) {
        console.error('The incoming chain is not canonical') // eslint-disable-line no-console
        return
      }

      if (comparison === 0) {
        return
      }
    }

    if (onSuccess) onSuccess()
    console.log('replacing chain with', chain) // eslint-disable-line no-console
    this.chain = chain
  }

  // AD-14: compare two equal-length chains at the first block where their
  // hashes differ — the divergence point (AD-12: equal hashes mean the same
  // block). Returns -1 when `a` is lower, 1 when `a` is higher, 0 when
  // identical.
  static compareForks(a, b) {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].hash !== b[i].hash) return a[i].hash < b[i].hash ? -1 : 1
    }
    return 0
  }

  static async isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
      return false
    }

    // SEQUENTIAL fold (AD-10): the running state must carry across blocks,
    // so blocks are validated one at a time and the state advances only
    // when a block validates.
    let state = {}
    for (const block of chain) {
      let ok = true
      try {
        ok = await block.validate({ state })
      } catch {
        ok = false
      }
      if (!ok) {
        return false
      }
      state = applyBlock(state, block)
    }
    return true
  }
}

export default Blockchain

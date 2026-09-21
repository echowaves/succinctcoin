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
    if (chain.length <= this.chain.length) {
      console.error('The incoming chain must be longer') // eslint-disable-line no-console
      return
    }

    if (!await Blockchain.isValidChain(chain)) {
      console.error('The incoming chain must be valid') // eslint-disable-line no-console
      return
    }

    if (onSuccess) onSuccess()
    console.log('replacing chain with', chain) // eslint-disable-line no-console
    this.chain = chain
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

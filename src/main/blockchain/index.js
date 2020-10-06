// import Crypto from '../util/crypto'
import Block from './block'

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
      newBlock.mineBlock({ wallet })

      await newBlock.validate()

      this.chain.push(newBlock)
    } catch (error) {
      // console.error(error)
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

    let isChainValid = true
    try {
      await Promise.all(chain.map(async block => {
        await block.validate()
      }))
    } catch (error) {
      isChainValid = false
    }
    return isChainValid
  }
}

export default Blockchain

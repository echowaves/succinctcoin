// import Crypto from '../util/crypto'
import Block from './block'

class Blockchain {
  constructor() {
    this.chain = [
      Block.genesis(),
    ]
  }

  addBlock({ data, wallet }) {
    const newBlock = new Block({ lastBlock: this.chain[this.chain.length - 1], data })
      .mineBlock({ wallet })
    try {
      newBlock.validate()
      this.chain.push(newBlock)
    } catch (error) {
      return null
    }
    return newBlock
  }

  replaceChain(chain, onSuccess) {
    if (chain.length <= this.chain.length) {
      console.error('The incoming chain must be longer') // eslint-disable-line no-console
      return
    }

    if (!Blockchain.isValidChain(chain)) {
      console.error('The incoming chain must be valid') // eslint-disable-line no-console
      return
    }

    if (onSuccess) onSuccess()
    console.log('replacing chain with', chain) // eslint-disable-line no-console
    this.chain = chain
  }

  static isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
      return false
    }
    for (let i = 1; i < chain.length; i++) { // eslint-disable-line no-plusplus
      try {
        chain[i].validate()
      } catch (error) {
        console.error('Invalid chain', error) // eslint-disable-line no-console
        return false
      }
    }

    return true
  }
}

export default Blockchain

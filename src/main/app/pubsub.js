import globalConfig from '../../config'

import Room from 'ipfs-pubsub-room'

import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { MulticastDNS } from '@libp2p/mdns'
import { FloodSub } from '@libp2p/floodsub'



// express app
class PubSub {
  constructor({ blockchain, transactionPool, wallet }) {
    this.blockchain = blockchain
    this.transactionPool = transactionPool
    this.wallet = wallet
    // this.discoverPeers() // this is where it hangs
  }

  async discoverPeers() {
    // create a node, assign to the class variable, discover peers,
    // and have the node establish connections to the peers
    // const peerId = await PeerId.create()


    const node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      },
      transports: [new TCP()],
      streamMuxers: [new Mplex()],
      connectionEncryption: [new Noise()],
      pubsub: new FloodSub()
    })
  
    await node.start()
    console.log('>libp2p has started') // eslint-disable-line no-console

    // console.log(node.multiaddrs)
    // console.log(node.addressManager.getListenAddrs())
    // console.log(node.addressManager.getAnnounceAddrs())
    // console.log(node.addressManager.getNoAnnounceAddrs())
    // console.log(node.transportManager.getAddrs())

    this.blockChainRoom = new Room(node, globalConfig.CHANNELS.BLOCKCHAIN)
    this.transactionRoom = new Room(node, globalConfig.CHANNELS.TRANSACTION)

    this.blockChainRoom.on('message', async message => {
      console.log('blockChainRoom received:', message) // eslint-disable-line no-console
      const parsedMessage = JSON.parse(message.data.toString('utf8'))
      // console.log('message.data:', parsedMessage)
      await this.blockchain.replaceChain(parsedMessage, true, () => {
        this.transactionPool.clearBlockchainTransactions({
          chain: parsedMessage,
        })
      })
    })

    this.transactionRoom.on('message', message => {
      console.log('transactionRoom received:', message) // eslint-disable-line no-console
      const parsedMessage = JSON.parse(message.data.toString('utf8'))
      // console.log('message.data:', parsedMessage)
      this.transactionPool.setTransaction(parsedMessage)
    })

    this.blockChainRoom.on('peer joined', peer => {
      console.log(`Peer joined ${globalConfig.CHANNELS.BLOCKCHAIN} room ${new Date()}`, peer) // eslint-disable-line no-console
      this.broadcastChain()
    })
    this.transactionRoom.on('peer joined', peer => {
      console.log(`Peer joined ${globalConfig.CHANNELS.TRANSACTION} room ${new Date()}`, peer) // eslint-disable-line no-console
    })

    this.blockChainRoom.on('peer left', peer => {
      console.log(`Peer left ${globalConfig.CHANNELS.BLOCKCHAIN} room  ${new Date()}`, peer) // eslint-disable-line no-console
    })
    this.transactionRoom.on('peer left', peer => {
      console.log(`Peer left ${globalConfig.CHANNELS.TRANSACTION} room ${new Date()}`, peer) // eslint-disable-line no-console
    })
  }

  broadcastChain() {
    if (this.blockChainRoom) {
      this.blockChainRoom.broadcast(JSON.stringify(this.blockchain.chain))
    }
  }

  broadcastTransaction(transaction) {
    this.transactionRoom.broadcast(JSON.stringify(transaction))
  }
}

export default PubSub

// const redis = require('redis');
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')

const Room = require('ipfs-pubsub-room')

const CHANNELS = {
  TEST: 'TEST',
  BLOCKCHAIN: 'BLOCKCHAIN',
  TRANSACTION: 'TRANSACTION',
}

class PubSub {
  constructor({ blockchain, transactionPool, wallet }) {
    this.blockchain = blockchain
    this.transactionPool = transactionPool
    this.wallet = wallet
    this.discoverPeers()
  }

  async discoverPeers() {
    // create a node, assign to the class variable, discover peers,
    // and have the node establish connections to the peers
    const node = await Libp2p.create({
      modules: {
        transport: [
          TCP,
          // new WS() // It can take instances too!
        ],
        streamMuxer: [
          MPLEX,
        ],
        connEncryption: [
          SECIO,
        ],
        peerDiscovery: [
          MulticastDNS,
        ],
        dht: DHT,
        pubsub: GossipSub,
      },
      config: {
        peerDiscovery: {
          autoDial: true, // Auto connect to discovered peers (limited by ConnectionManager minPeers)
          mdns: { // mdns options
            interval: 1000, // ms
            enabled: true,
          },
        },
        relay: { // Circuit Relay options
          enabled: true,
          hop: {
            enabled: true,
            active: true,
          },
        },
        dht: {
          // dht must be enabled
          enabled: true,
          randomWalk: {
            enabled: true,
          },
        },
      },
    })

    // await node.peerInfo.multiaddrs.add('/ip6/::1/tcp/0')
    // await node.peerInfo.multiaddrs.add('/ip6/::/tcp/0')
    await node.peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

    await node.start()
    console.log('libp2p has started') // eslint-disable-line no-console

    this.blockChainRoom = new Room(node, CHANNELS.BLOCKCHAIN)
    this.transactionRoom = new Room(node, CHANNELS.TRANSACTION)

    this.blockChainRoom.on('message', message => {
      console.log('blockChainRoom received:', message) // eslint-disable-line no-console
      const parsedMessage = JSON.parse(message.data.toString('utf8'))
      // console.log('message.data:', parsedMessage)
      this.blockchain.replaceChain(parsedMessage, true, () => {
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
      console.log(`Peer joined blockChainRoom  ${new Date()}`, peer) // eslint-disable-line no-console
      this.broadcastChain()
    })
    this.transactionRoom.on('peer joined', peer => {
      console.log(`Peer joined transactionRoom ${new Date()}`, peer) // eslint-disable-line no-console
    })

    this.blockChainRoom.on('peer left', peer => {
      console.log(`Peer left blockChainRoom  ${new Date()}`, peer) // eslint-disable-line no-console
    })
    this.transactionRoom.on('peer left', peer => {
      console.log(`Peer left transactionRoom ${new Date()}`, peer) // eslint-disable-line no-console
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

module.exports = PubSub

import globalConfig from '../../config'

const Libp2p = require('libp2p')

const KadDHT = require('libp2p-kad-dht')
const TCP = require('libp2p-tcp')
const MDNS = require('libp2p-mdns')

const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')

// const { NOISE } = require('libp2p-noise')

// const MulticastDNS = require('libp2p-mdns')
// const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')

const Room = require('ipfs-pubsub-room')

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

    const node = await Libp2p.create({
      // peerId,
      addresses: {
      //   // Add the signaling server address, along with our PeerId to our multiaddrs list
      //   // libp2p will automatically attempt to dial to the signaling server so that it can
      //   // receive inbound connections from other peers
        listen: [
          '/ip4/0.0.0.0/tcp/0',
        ],
      },
      modules: {
        transport: [TCP],
        streamMuxer: [MPLEX],
        connEncryption: [SECIO],
        peerDiscovery: [MDNS],
        dht: KadDHT,
        pubsub: GossipSub,
      },
      config: {
        peerDiscovery: {
          autoDial: true,
        },
        pubsub: { // The pubsub options (and defaults) can be found in the pubsub router documentation
          enabled: true,
          emitSelf: true, // whether the node should emit to self on publish
          signMessages: true, // if messages should be signed
          strictSigning: true, // if message signing should be required
        },
        // relay: { // Circuit Relay options
        //   enabled: true,
        //   hop: {
        //     enabled: true,
        //     active: true,
        //   },
        // },
        dht: { // The DHT options (and defaults) can be found in its documentation
          // kBucketSize: 20,
          enabled: true,
          randomWalk: {
            enabled: true, // Allows to disable discovery (enabled by default)
            // interval: 300e3,
            // timeout: 10e3,
          },
        },
      },
    })

    // await node.peerInfo.multiaddrs.add('/ip6/::1/tcp/0')
    // await node.peerInfo.multiaddrs.add('/ip6/::/tcp/0')

    // await node.peerStore.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    // await node.peerStore.addressBook.add('/ip4/0.0.0.0/tcp/0')

    await node.start()
    console.log('libp2p has started') // eslint-disable-line no-console

    console.log(node.multiaddrs)
    console.log(node.addressManager.getListenAddrs())
    console.log(node.addressManager.getAnnounceAddrs())
    console.log(node.addressManager.getNoAnnounceAddrs())
    console.log(node.transportManager.getAddrs())

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

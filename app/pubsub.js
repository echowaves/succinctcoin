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
  TRANSACTION: 'TRANSACTION'
};

class PubSub {
  constructor({ blockchain, transactionPool, wallet}) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;
    this.wallet = wallet;
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
        streamMuxer: [MPLEX],
        connEncryption: [SECIO],
        peerDiscovery: [MulticastDNS],
        dht: DHT,
        pubsub: GossipSub
      }
    })

    await node.peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
    await node.start()
    console.log('libp2p has started')

    this.blockChainRoom = new Room(node, CHANNELS.BLOCKCHAIN)
    this.transactionRoom = new Room(node, CHANNELS.TRANSACTION)

    this.blockChainRoom.on('message', (message) => {
      console.log('blockChainRoom received:', message)
      const parsedMessage =  JSON.parse(message.data.toString('utf8'));
      // console.log('message.data:', parsedMessage)
      this.blockchain.replaceChain(parsedMessage, true, () => {
        this.transactionPool.clearBlockchainTransactions({
          chain: parsedMessage
        });
      });
    })

    this.transactionRoom.on('message', (message) => {
      console.log('transactionRoom received:', message)
      const parsedMessage =  JSON.parse(message.data.toString('utf8'));
      // console.log('message.data:', parsedMessage)
      this.transactionPool.setTransaction(parsedMessage);
    })
  }

  broadcastChain() {
    if(this.blockChainRoom) {
      this.blockChainRoom.broadcast(JSON.stringify(this.blockchain.chain));
    }
  }

  broadcastTransaction(transaction) {
    this.transactionRoom.broadcast(JSON.stringify(transaction))
  }
}

module.exports = PubSub;

// const redis = require('redis');
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const Gossipsub = require('libp2p-gossipsub')




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

    // this.publisher = redis.createClient(redisUrl);
    // this.subscriber = redis.createClient(redisUrl);


    this.discoverPeers()
    .then( () => {
      // this.subscribeToChannels();
    })
  }

  async discoverPeers() {
    // create a node, assign to the class variable, discover peers,
    // and have the node establish connections to the peers
    this.node = await Libp2p.create({
      modules: {
        transport: [ TCP ],
        streamMuxer: [ MPLEX ],
        connEncryption: [ SECIO ],
        // we add the Pubsub module we want
        peerDiscovery: [ MulticastDNS ],
        pubsub: Gossipsub
      },
      config: {
        peerDiscovery: {
          mdns: {
            interval: 20e3,
            enabled: true
          }
        }
      }
    })
    this.node.peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

    this.node.on('peer:discovery', (peer) => {
      console.log('Discovered:', peer.id.toB58String())
    })
    this.node.on('peer:connect', (peer) => {
      console.log('Connected to %s', peer.id.toB58String()) // Log connected peer
    })

    // console.log(this.node)
    await this.node.start()
    console.log('libp2p has started')

  }

  handleMessage(channel, message) {
    console.log(`Message received. Channel: ${channel}. Message: ${message}.`);

    const parsedMessage = JSON.parse(message);

    switch(channel) {
      case CHANNELS.BLOCKCHAIN:
      this.blockchain.replaceChain(parsedMessage, true, () => {
        this.transactionPool.clearBlockchainTransactions({
          chain: parsedMessage
        });
      });
      break;
      case CHANNELS.TRANSACTION:
      this.transactionPool.setTransaction(parsedMessage);
      break;
      default:
      return;
    }
  }

  subscribeToChannels() {
    Object.values(CHANNELS).forEach(channel => {
      PubSub.subscribe(channel, mySubscriber);
      this.subscriber.subscribe(channel);
    });
  }

  publish({ channel, message }) {
    // this.subscriber.unsubscribe(channel, () => {
    //   this.publisher.publish(channel, message, () => {
    //     this.subscriber.subscribe(channel);
    //   });
    // });
  }

  broadcastChain() {
    this.publish({
      channel: CHANNELS.BLOCKCHAIN,
      message: JSON.stringify(this.blockchain.chain)
    });
  }

  broadcastTransaction(transaction) {
    this.publish({
      channel: CHANNELS.TRANSACTION,
      message: JSON.stringify(transaction)
    });
  }
}

module.exports = PubSub;

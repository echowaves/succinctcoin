import Room from 'ipfs-pubsub-room'
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { floodsub } from '@libp2p/floodsub'
import { Discv5Discovery } from '@chainsafe/discv5'
import { SignableENR } from '@chainsafe/enr'
import { relay } from '@libp2p/circuit-relay-v2'
import { autoNAT } from '@libp2p/autonat'
import { dcutr } from '@libp2p/dcutr'
import { upnpNat } from '@libp2p/upnp-nat'

import globalConfig from '../../config'



// express app
class PubSub {
  constructor({ blockchain, transactionPool, wallet }) {
    this.blockchain = blockchain
    this.transactionPool = transactionPool
    this.wallet = wallet
    // this.discoverPeers() // this is where it hangs
  }

  async discoverPeers() {
    console.log('[discv5] Starting peer discovery...') // eslint-disable-line no-console

    // Get libp2p PeerId from wallet's secp256k1 key
    let peerId
    try {
      peerId = await this.wallet.getPeerId()
      console.log(`[discv5] Peer ID: ${peerId.toString()}`) // eslint-disable-line no-console
    } catch (err) {
      console.error('[discv5] Failed to generate PeerId:', err.message) // eslint-disable-line no-console
      throw err
    }

    // Generate ENR from PeerId
    let enr
    try {
      enr = SignableENR.createFromPeerId(peerId)
      console.log(`[discv5] ENR: ${enr.encodeBase64()}`) // eslint-disable-line no-console
    } catch (err) {
      console.error('[discv5] Failed to create ENR:', err.message) // eslint-disable-line no-console
      throw err
    }

    const bootstrapEnrs = globalConfig.DISCV5_BOOTSTRAP_ENRS || []
    const relayEndpoints = globalConfig.RELAY_ENDPOINTS || []

    console.log(`[discv5] Bootstrap ENRs: ${bootstrapEnrs.length}`) // eslint-disable-line no-console
    console.log(`[discv5] Relay endpoints: ${relayEndpoints.length}`) // eslint-disable-line no-console

    const node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0'],
      },
      transports: [tcp(), relay()],
      streamMuxers: [mplex()],
      connectionEncrypters: [noise()],
      pubsub: floodsub(),
      peerDiscovery: [
        () => new Discv5Discovery({
          enabled: bootstrapEnrs.length > 0,
          enr: enr,
          peerId: peerId,
          bindAddrs: { ip4: `/ip4/0.0.0.0/udp/${globalConfig.DISCV5_UDP_PORT}` },
          bootstrapEnrs: bootstrapEnrs,
          searchInterval: globalConfig.DISCV5_SEARCH_INTERVAL,
        }),
      ],
      services: {
        autoNAT: autoNAT(),
        dcutr: dcutr(),
        upnpNat: upnpNat(),
      },
    })
    // Log relay status
    const hasRelay = relayEndpoints.length > 0
    if (hasRelay) {
      console.log(`[discv5] Relay enabled: ${relayEndpoints.length} endpoint(s)`) // eslint-disable-line no-console
    } else {
      console.log('[discv5] Relay not configured — direct connections only') // eslint-disable-line no-console
    }
    // Create rooms immediately after node starts (before peer discovery)
    // so they exist even if peer discovery fails
    try {
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
        console.log(`Peer left ${globalConfig.CHANNELS.BLOCKCHAIN} room      ${new Date()}`, peer) // eslint-disable-line no-console
      })
      this.transactionRoom.on('peer left', peer => {
        console.log(`Peer left ${globalConfig.CHANNELS.TRANSACTION} room ${new Date()}`, peer) // eslint-disable-line no-console
      })
    } catch (roomError) {
      console.error('Failed to create pubsub rooms:', roomError.message) // eslint-disable-line no-console
    }
  }

  broadcastChain() {
    if (this.blockChainRoom) {
      this.blockChainRoom.broadcast(JSON.stringify(this.blockchain.chain))
    }
  }

  broadcastTransaction(transaction) {
    if (this.transactionRoom) {
      this.transactionRoom.broadcast(JSON.stringify(transaction))
    }
  }
}

export default PubSub

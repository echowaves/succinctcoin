import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import { gossipsub } from '@libp2p/gossipsub'
import { Discv5Discovery } from '@chainsafe/discv5'
import { SignableENR } from '@chainsafe/enr'
import { relay } from '@libp2p/circuit-relay-v2'
import { autoNAT } from '@libp2p/autonat'
import { dcutr } from '@libp2p/dcutr'
import { upnpNat } from '@libp2p/upnp-nat'

import globalConfig from '../../config'

// Topic constants
const BLOCKCHAIN_TOPIC = globalConfig.CHANNELS.BLOCKCHAIN
const TRANSACTION_TOPIC = globalConfig.CHANNELS.TRANSACTION

// Peer count tracking for broadcast-on-join
let blockchainPeerCount = 0
let transactionPeerCount = 0

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
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      pubsub: gossipsub(),
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
      console.log('[discv5] Relay not configured - direct connections only') // eslint-disable-line no-console
    }

    // Subscribe to topics (replaces ipfs-pubsub-room)
    try {
      await node.pubsub.subscribe(BLOCKCHAIN_TOPIC)
      await node.pubsub.subscribe(TRANSACTION_TOPIC)

      // Store node reference for broadcast methods
      this._node = node

      // Listen for messages on both topics
      node.pubsub.addEventListener('message', async event => {
        if (event.detail.topic === BLOCKCHAIN_TOPIC) {
          const parsedMessage = JSON.parse(new TextDecoder().decode(event.detail.data))
          // console.log('blockchain message:', parsedMessage)
          await this.blockchain.replaceChain(parsedMessage, true, () => {
            this.transactionPool.clearBlockchainTransactions({
              chain: parsedMessage,
            })
          })
        } else if (event.detail.topic === TRANSACTION_TOPIC) {
          const parsedMessage = JSON.parse(new TextDecoder().decode(event.detail.data))
          // console.log('transaction message:', parsedMessage)
          this.transactionPool.setTransaction(parsedMessage)
        }
      })

      // Check for peer changes periodically (replaces peer joined/left events)
      const checkPeerChanges = () => {
        const blockchainPeers = node.pubsub.getPeers(BLOCKCHAIN_TOPIC)
        const transactionPeers = node.pubsub.getPeers(TRANSACTION_TOPIC)

        // Detect new peers joining blockchain room
        if (blockchainPeers.length > blockchainPeerCount) {
          const newPeers = blockchainPeers.filter(p =>
            !this._peerIdsIncluded(blockchainPeerCount, blockchainPeers),
          )
          console.log(`[discv5] Peer joined ${BLOCKCHAIN_TOPIC} room ${new Date()}`, newPeers) // eslint-disable-line no-console
          this.broadcastChain()
        }
        blockchainPeerCount = blockchainPeers.length

        // Detect new peers joining transaction room
        if (transactionPeers.length > transactionPeerCount) {
          const newPeers = transactionPeers.filter(p =>
            !this._peerIdsIncluded(transactionPeerCount, transactionPeers),
          )
          console.log(`[discv5] Peer joined ${TRANSACTION_TOPIC} room ${new Date()}`, newPeers) // eslint-disable-line no-console
        }
        transactionPeerCount = transactionPeers.length
      }

      // Initial check and periodic polling
      checkPeerChanges()
      setInterval(checkPeerChanges, 5000)
    } catch (roomError) {
      console.error('Failed to subscribe to pubsub topics:', roomError.message) // eslint-disable-line no-console
    }
  }

  // Helper to check if peer count has increased
  _peerIdsIncluded(count, peerList) {
    return peerList.length <= count
  }

  broadcastChain() {
    if (this._node && this._node.pubsub) {
      const encoded = new TextEncoder().encode(JSON.stringify(this.blockchain.chain))
      this._node.pubsub.publish(BLOCKCHAIN_TOPIC, encoded)
    }
  }

  broadcastTransaction(transaction) {
    if (this._node && this._node.pubsub) {
      const encoded = new TextEncoder().encode(JSON.stringify(transaction))
      this._node.pubsub.publish(TRANSACTION_TOPIC, encoded)
    }
  }
}

export default PubSub

import isDev from "electron-is-dev"

const { name } = require('../package.json')

const DEFAULT_PORT = isDev ? 3001 : 3333

const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`

console.log({ ROOT_NODE_ADDRESS })

const devPrefix = isDev ? `DEV-${name}-` : `${name}-`

const CHANNELS = {
  BLOCKCHAIN: `${devPrefix}BLOCKCHAIN`,
  TRANSACTION: `${devPrefix}TRANSACTION`,
}

// discv5 peer discovery configuration
const DISCV5_UDP_PORT = 9000
const DISCV5_SEARCH_INTERVAL = 30000 // 30 seconds
// Bootstrap ENRs — well-known nodes on the discv5 DHT
// These point to the public VPS running the bootstrap node
const DISCV5_BOOTSTRAP_ENRS = [
  // TODO: Replace with actual VPS bootstrap ENR after deployment
  // 'enr:-MY4QDHyZxP8K7mF3jR2vL9wE5tA6bC1dX0yU8iO3gHfJKlMnOpQrStUvWxYz',
]
// Relay server endpoints — used when direct connection is not possible
const RELAY_ENDPOINTS = [
  // TODO: Replace with actual VPS relay endpoint after deployment
  // '/ip4/203.0.113.5/tcp/4001/p2p/<VPS_PEER_ID>',
]

export default {
  DEFAULT_PORT,
  ROOT_NODE_ADDRESS,
  CHANNELS,
  DISCV5_UDP_PORT,
  DISCV5_SEARCH_INTERVAL,
  DISCV5_BOOTSTRAP_ENRS,
  RELAY_ENDPOINTS,
}

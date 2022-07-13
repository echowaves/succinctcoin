import isDev from "electron-is-dev"

const { name } = require('../package.json')

const DEFAULT_PORT = isDev ? 3001 : 3333

const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`

console.log({ROOT_NODE_ADDRESS})

const devPrefix = isDev ? `DEV-${name}-` : `${name}-`

const CHANNELS = {
  BLOCKCHAIN: `${devPrefix}BLOCKCHAIN`,
  TRANSACTION: `${devPrefix}TRANSACTION`,
}

export default {
  DEFAULT_PORT,
  ROOT_NODE_ADDRESS,
  CHANNELS,
}

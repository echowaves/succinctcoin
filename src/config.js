const isDev = require("electron-is-dev")

const { name } = require('../package.json')

const DEFAULT_PORT = isDev ? 3000 : 3333

const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`

const devPrefix = isDev ? `DEV-${name}-` : `${name}-`

const CHANNELS = {
  BLOCKCHAIN: `${devPrefix}BLOCKCHAIN`,
  TRANSACTION: `${devPrefix}TRANSACTION`,
}

module.exports = {
  DEFAULT_PORT,
  ROOT_NODE_ADDRESS,
  CHANNELS,
}

const isDev = require("electron-is-dev")

const { name } = require('../package.json')

const DEFAULT_PORT = isDev ? 3000 : 3333

const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`

const MINE_RATE = 1000
const INITIAL_DIFFICULTY = 3

const GENESIS_DATA = {
  timestamp: 1,
  lastHash: '-----',
  hash: 'hash-one',
  difficulty: INITIAL_DIFFICULTY,
  nonce: 0,
  data: [],
}

const STARTING_BALANCE = 1000

const REWARD_INPUT = { address: '*authorized-reward*' }

const MINING_REWARD = 50

const devPrefix = isDev ? `DEV-${name}-` : `${name}-`

const CHANNELS = {
  BLOCKCHAIN: `${devPrefix}BLOCKCHAIN`,
  TRANSACTION: `${devPrefix}TRANSACTION`,
}

module.exports = {
  DEFAULT_PORT,
  ROOT_NODE_ADDRESS,
  GENESIS_DATA,
  MINE_RATE,
  STARTING_BALANCE,
  REWARD_INPUT,
  MINING_REWARD,
  CHANNELS,
}

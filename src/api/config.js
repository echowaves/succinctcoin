const DEFAULT_PORT = 3030
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

const REWARD_INPUT = { address: '*authorized-reward*', }

const MINING_REWARD = 50

module.exports = {
  DEFAULT_PORT,
  ROOT_NODE_ADDRESS,
  GENESIS_DATA,
  MINE_RATE,
  STARTING_BALANCE,
  REWARD_INPUT,
  MINING_REWARD,
}

const VALIDATION_RATE = 1000 // how often to generate a block, how may transactions

const GENESIS_DATA = {
  timestamp: 1,
  lastHash: '-----',
  hash: 'hash-one',
  nonce: 0,
  data: [],
}

const STARTING_BALANCE = 0

const REWARD_ADDRESS = { address: '*authorized-reward*' }
const STAKE_ADDRESS = { address: '*authorized-stake*' }

const REWARD_AMOUNT = 50

module.exports = {
  GENESIS_DATA,
  VALIDATION_RATE,
  STARTING_BALANCE,
  REWARD_ADDRESS,
  STAKE_ADDRESS,
  REWARD_AMOUNT,
}

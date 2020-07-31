import path from 'path'
import fs from 'fs'

const { name } = require('../../package.json')

const VALIDATION_RATE = 1000 // how often to generate a block, how may transactions

const GENESIS_DATA = {
  timestamp: 1,
  lastHash: '-----',
  hash: 'hash-one',
  nonce: 0,
  data: [],
}

const STARTING_BALANCE = 0

const ROOT = (process.env.JEST_WORKER_ID === undefined)
  ? path.resolve(`.${name}`) : path.resolve('.test')

const STORE = {
  WALLET: path.resolve(ROOT, 'wallet'),
  KEY: path.resolve(ROOT, 'wallet'),
  ACCOUNTS: path.resolve(ROOT, 'accounts'),
  BLOCKS: path.resolve(ROOT, 'blocks'),
}

if (!fs.existsSync(ROOT)) {
  fs.mkdirSync(ROOT)
}
if (!fs.existsSync(STORE.ACCOUNTS)) {
  fs.mkdirSync(STORE.ACCOUNTS)
}
if (!fs.existsSync(STORE.BLOCKS)) {
  fs.mkdirSync(STORE.BLOCKS)
}

const REWARD_ADDRESS = { address: '*authorized-reward*' }
const STAKE_ADDRESS = { address: '*authorized-stake*' }

const REWARD_AMOUNT = 50

module.exports = {
  GENESIS_DATA,
  VALIDATION_RATE,
  STARTING_BALANCE,
  STORE,
  REWARD_ADDRESS,
  STAKE_ADDRESS,
  REWARD_AMOUNT,
}

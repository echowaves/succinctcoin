import path from 'path'
import fs from 'fs'

const { name } = require('../../package.json')

const VALIDATION_RATE = 1000 // how often to generate a block, how may transactions

const GENESIS_DATA = {
  height: 0,
  uuid: 'GENESIS',
  timestamp: 0,
  validator: 'GENESIS',
  lastHash: 'GENESIS',
  hash: 'GENESIS',
  data: ['GENESIS'],
  signature: 'GENESIS',
}

const STARTING_BALANCE = 0

const ROOT = (process.env.JEST_WORKER_ID === undefined)
  ? path.resolve(process.env.HOME, `.${name}`) : path.resolve('.test')

const STORE = {
  WALLET: path.resolve(ROOT, 'wallet'),
  ACCOUNTS: path.resolve(ROOT, 'accounts'),
  BLOCKS: path.resolve(ROOT, 'blocks'),
  UUID: path.resolve(ROOT, 'uuid'),
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

const REWARD_ADDRESS = '*authorized-reward*'
const STAKE_ADDRESS = '*authorized-stake*'
const CREDIT_ADDRESS = '*authorized-credit*'

const REWARD_AMOUNT = 100
const MINIMUM_STAKE_AMOUNT = 200

// AD-12: the pinned canonical hash-input field set for a block. The list is a
// versioned constant so any change to the field set or to the canonical data
// order is a deliberate, flagged hard fork. The constant does NOT enter the
// hash input itself (the field set is closed).
const BLOCK_CONTENT_VERSION = 1
const BLOCK_CONTENT_FIELDS = ['height', 'uuid', 'timestamp', 'miner', 'lastHash', 'data']

// AD-11: the single free lottery parameter. p = 1 / LOTTERY_ODDS; the win
// threshold is the exact integer 2^512 / LOTTERY_ODDS (no floats).
const LOTTERY_ODDS = 1000

export default {
  GENESIS_DATA,
  VALIDATION_RATE,
  STARTING_BALANCE,
  STORE,
  REWARD_ADDRESS,
  STAKE_ADDRESS,
  CREDIT_ADDRESS,
  REWARD_AMOUNT,
  MINIMUM_STAKE_AMOUNT,
  LOTTERY_ODDS,
  BLOCK_CONTENT_VERSION,
  BLOCK_CONTENT_FIELDS,
}

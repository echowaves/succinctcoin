import config from '../config'

const Big = require('big.js')

// AD-10: the single core state-transition function.
// Account state is derived purely from chain contents — no disk, no fs,
// no network, no globals mutated. An account absent from `state` has
// balance '0' and stake '0'.

function getAccountEntry(state, publicKey) {
  const entry = state[publicKey]

  if (!entry) {
    return { balance: '0', stake: '0' }
  }

  return { balance: entry.balance, stake: entry.stake }
}

function isRewardTransaction(tx) {
  return tx && tx.recipient === config.REWARD_ADDRESS
}

function isStakeTransaction(tx) {
  return tx && tx.recipient === config.STAKE_ADDRESS
}

// Applies a single transaction to `state` in place, following the
// debit/credit rules:
// - reward: credits REWARD_AMOUNT to the block's miner
// - stake:  debits amount+fee from free balance, moves amount into stake
// - transfer: debits amount+fee from the sender, credits amount to the
//   recipient and fee to the miner
function applyTransaction(state, tx, miner) {
  if (!isRewardTransaction(tx) && !isStakeTransaction(tx)) {
    const sender = getAccountEntry(state, tx.sender)

    state[tx.sender] = {
      balance: Big(sender.balance).minus(tx.amount).minus(tx.fee).toString(),
      stake: sender.stake,
    }

    const recipient = getAccountEntry(state, tx.recipient)

    state[tx.recipient] = {
      balance: Big(recipient.balance).plus(tx.amount).toString(),
      stake: recipient.stake,
    }

    const feeRecipient = getAccountEntry(state, miner)

    state[miner] = {
      balance: Big(feeRecipient.balance).plus(tx.fee).toString(),
      stake: feeRecipient.stake,
    }

    return state
  }

  if (isStakeTransaction(tx)) {
    const sender = getAccountEntry(state, tx.sender)

    state[tx.sender] = {
      balance: Big(sender.balance).minus(tx.amount).minus(tx.fee).toString(),
      stake: Big(sender.stake).plus(tx.amount).toString(),
    }

    const feeRecipient = getAccountEntry(state, miner)

    state[miner] = {
      balance: Big(feeRecipient.balance).plus(tx.fee).toString(),
      stake: feeRecipient.stake,
    }

    return state
  }

  // reward transaction
  const minerEntry = getAccountEntry(state, miner)

  state[miner] = {
    balance: Big(minerEntry.balance).plus(config.REWARD_AMOUNT).toString(),
    stake: minerEntry.stake,
  }

  return state
}

// Folds one block's `data` over `state` via the shared transition.
function applyBlock(state, block) {
  block.data.forEach(tx => {
    if (tx && typeof tx === 'object' && tx.recipient !== undefined) {
      applyTransaction(state, tx, block.miner)
    }
  })

  return state
}

// Derives the final account state of an entire chain: for each block, in
// order, apply every transaction via the shared transition.
function deriveState(chain) {
  const state = {}

  chain.forEach(block => {
    if (block && Array.isArray(block.data)) {
      applyBlock(state, block)
    }
  })

  return state
}

export { applyTransaction, applyBlock }
export default deriveState

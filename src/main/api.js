
import globalConfig from '../config'

import Blockchain from './blockchain'
import Wallet from './blockchain/wallet'
import TransactionPool from './blockchain/transaction-pool'
import TransactionMiner from './app/transaction-miner'
import syncRootState from './app/root-sync'
import deriveState from './blockchain/state'
import BlockchainError, { ERROR_CODES } from './blockchain/errors'
import config from './config'
import PubSub from './app/pubsub'
import mapErrorToResponse from './app/error-mapper'

const path = require('path')
const fs1 = require('fs') // TODO: remove

const Big = require('big.js')
const express = require('express')
const { ipcMain } = require('electron')
const cors = require('cors')
const isDev = require('electron-is-dev')

const api = express()
const blockchain = new Blockchain()
const transactionPool = new TransactionPool()

// try to retreive from diskx
let wallet
let account
let pubsub
let transactionMiner

const init = async () => {
  wallet = await (new Wallet()).retrieveThrough()
  account = await wallet.getAccount() // ensure that the account is created and stored on disk
  pubsub = new PubSub({ blockchain, transactionPool, wallet })
  try {
    await pubsub.discoverPeers()
  } catch (error) {
    console.error('error discovering peers') // eslint-disable-line no-console
    console.error(error) // eslint-disable-line no-console
  }

  transactionMiner = new TransactionMiner({
    blockchain, transactionPool, wallet, pubsub,
  })
  // AD-4: mining is autonomous; the HTTP endpoint below is a dev convenience
  transactionMiner.start()
}

api.use(express.json())
api.use(express.static(path.join(__dirname, 'client/dist')))

// enable CORS
api.use(cors())

ipcMain.on('/api/blocks', (event, arg) => {

})

api.get('/api/blocks', (req, res) => {
  res.json(blockchain.chain)
})

api.get('/api/blocks/length', (req, res) => {
  res.json(blockchain.chain.length)
})

api.get('/api/blocks/:id', (req, res) => {
  const { id } = req.params
  const { length } = blockchain.chain

  const blocksReversed = blockchain.chain.slice().reverse()

  let startIndex = (id - 1) * 5
  let endIndex = id * 5

  startIndex = startIndex < length ? startIndex : length
  endIndex = endIndex < length ? endIndex : length

  res.json(blocksReversed.slice(startIndex, endIndex))
})

// api.post('/api/mine', (req, res) => {
//   const { data } = req.body
//
//   const block = blockchain.addBlock({ data })
//   transactionPool.clearBlockchainTransactions({ block })
//   pubsub.broadcastChain()
//
//   res.redirect('/api/blocks')
// })

// dev-only convenience (AD-4): autonomous mining is the mining path
if (isDev) {
  api.get('/api/mine-transactions', async (req, res) => {
    await transactionMiner.mineTransactions()

    res.redirect('/api/blocks')
  })
}

// AD-9: the app layer owns the HTTP envelope. `transact` takes every
// collaborator as a parameter (dependency-injected) so the endpoint logic is
// testable without a server; it is not side-effect-free — it mutates the pool,
// broadcasts, and writes the response.
const transact = async ({ blockchain, wallet, transactionPool, pubsub, req, res }) => {
  const { amount, recipient } = req.body

  try {
    // Pre-check: a malformed amount is rejected before any transaction is
    // created. Normalize the Big error to the typed 400 (a raw Big throw in
    // the catch would map to 500).
    try {
      new Big(amount)
    } catch {
      throw new BlockchainError('Amount invalid', ERROR_CODES.INVALID_TRANSACTION)
    }

    const transaction = await wallet.createTransaction({
      recipient,
      amount,
      fee: Big(amount).div(1000), // automatically calculate fee
    })
    const state = deriveState(blockchain.chain)
    await transaction.validate({ state })

    // A second pending transaction from a sender that already has one in
    // the pool is a double-spend candidate: reject it (409) before the pool
    // is mutated. Validation runs against the derived chain state, which
    // ignores pending pool transactions, so this check is what keeps the
    // miner from putting both spends in one block.
    if (transactionPool.existingTransaction({ sender: transaction.sender })) {
      throw new BlockchainError('Duplicate transactions', ERROR_CODES.DUPLICATE_TRANSACTION)
    }

    transactionPool.setTransaction(transaction)
    pubsub.broadcastTransaction(transaction)
    res.json({ type: 'success', transaction })
  } catch (error) {
    const { status, body } = mapErrorToResponse(error)

    res.status(status).json(body)
  }
}

api.post('/api/transact', async (req, res) => {
  await transact({ blockchain, wallet, transactionPool, pubsub, req, res })
})


api.get('/api/transaction-pool-map', (req, res) => {
  res.json(transactionPool.transactionMap)
})


ipcMain.on('/api/wallet-info', (event, arg) => {
  const address = wallet.publicKey

  const walletInfo = {
    address,
    account,
  }

  console.log({ walletInfo }) // eslint-disable-line no-console
  event.returnValue = walletInfo
})

// CAP-10/AD-8: the renderer's sole app-config surface is a synchronous pull
// of the API port; the owner of the value stays src/config.js (main process)
ipcMain.on('/api/port', event => {
  event.returnValue = globalConfig.DEFAULT_PORT
})

// AD-5/AD-13: root sync is bootstrap-only; the empty-chain gate and the
// additive pool merge live in the root-sync module (one owner)
const syncWithRootState = () => syncRootState({
  blockchain,
  transactionPool,
  fetchRootChain: async () => (await fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/blocks`)).json(),
  fetchRootPool: async () => (await fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/transaction-pool-map`)).json(),
})


export { transact }
export default { api, syncWithRootState, init }

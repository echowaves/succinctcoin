import Blockchain from './blockchain'
import Wallet from './blockchain/wallet'
import TransactionPool from './blockchain/transaction-pool'
import TransactionMiner from './app/transaction-miner'

import globalConfig from '../config'
import config from './config'
import PubSub from './app/pubsub'

const Big = require('big.js')

const bodyParser = require('body-parser')
const express = require('express')
const fetch = require("node-fetch")
const path = require('path')
// const fs = require('fs-extra')
const fs1 = require('fs') // TODO: remove

const cors = require('cors')

const api = express()
const blockchain = new Blockchain()
const transactionPool = new TransactionPool()
const wallet = new Wallet().retrieveOrNew()

const pubsub = new PubSub({ blockchain, transactionPool, wallet })

const transactionMiner = new TransactionMiner({
  blockchain, transactionPool, wallet, pubsub,
})

api.use(bodyParser.json())
api.use(express.static(path.join(__dirname, 'client/dist')))

// enable CORS
api.use(cors())

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

api.get('/api/mine-transactions', (req, res) => {
  transactionMiner.mineTransactions()

  res.redirect('/api/blocks')
})

api.post('/api/transact', (req, res) => {
  const { amount, recipient } = req.body

  let transaction
  // transactionPool
  //   .existingTransaction({ recipient: wallet.publicKey })
  try {
    // if (transaction) {
    //   const transactionObj = Object.assign(new Transaction({
    //     senderWallet: wallet, recipient, amount, outputMap: {}, input: {},
    //   }), transaction)
    //
    //   transactionObj.update({ senderWallet: wallet, recipient, amount })
    // } else {
    transaction = wallet.createTransaction({
      recipient,
      amount,
      fee: Big(amount).div(1000), // automatically calculate fee
    })
    transaction.validate()
    transactionPool.setTransaction(transaction)
    // }
  } catch (error) {
    return res.status(400).json({ type: 'error', message: error.message })
  }

  pubsub.broadcastTransaction(transaction)

  res.json({ type: 'success', transaction })
})

api.get('/api/transaction-pool-map', (req, res) => {
  res.json(transactionPool.transactionMap)
})

api.get('/api/wallet-info', (req, res) => {
  const address = wallet.publicKey

  res.json({
    address,
    account: wallet.getAccount(),
  })
})

// TODO: TODELETE
api.get('/api/known-addresses', (req, res) => {
  const addressMap = {}
  const files = fs1.readdirSync(`${config.STORE.ACCOUNTS}`)
  files.forEach(file => addressMap[file] = file) // eslint-disable-line no-return-assign

  res.json(Object.keys(addressMap))
})

const syncWithRootState = () => {
  fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/blocks`)
    .then(response => response.json())
    .then(json => {
      const rootChain = json

      console.log('replace chain on a sync with', rootChain) // eslint-disable-line no-console
      blockchain.replaceChain(rootChain)
    })

  fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/transaction-pool-map`)
    .then(response => response.json())
    .then(json => {
      const rootTransactionPoolMap = json

      console.log('replace transaction pool map on a sync with', rootTransactionPoolMap) // eslint-disable-line no-console
      transactionPool.setMap(rootTransactionPoolMap)
    })
}

export default { api, syncWithRootState }

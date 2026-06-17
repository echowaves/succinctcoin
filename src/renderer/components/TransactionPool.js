import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import globalConfig from '../../config'

import Transaction from './Transaction'

const POLL_INTERVAL_MS = 10000

function TransactionPool() {
  const [transactionPoolMap, setTransactionPoolMap] = useState({})
  const intervalRef = useRef(null)

  const fetchTransactionPoolMap = useCallback(() => {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/transaction-pool-map`)
      .then(response => response.json())
      .then(json => setTransactionPoolMap(json))
  }, [])

  const fetchMineTransactions = useCallback(() => {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/mine-transactions`)
      .then(response => {
        if (response.status === 200) {
          alert('success')
        } else {
          alert('The mine-transactions block request did not complete.')
        }
      })
  }, [])

  useEffect(() => {
    fetchTransactionPoolMap()
    intervalRef.current = setInterval(fetchTransactionPoolMap, POLL_INTERVAL_MS)

    return () => clearInterval(intervalRef.current)
  }, [fetchTransactionPoolMap])

  return (
    <div className="TransactionPool">
      <div><Link to="/">Home</Link></div>
      <h3>Transaction Pool</h3>
      {Object.values(transactionPoolMap).map(transaction => (
        <div key={transaction.uuid}>
          <hr />
          <Transaction transaction={transaction} />
        </div>
      ))}
      <hr />
      <Button
        bsstyle="danger"
        onClick={fetchMineTransactions}>
        Mine the Transactions
      </Button>
    </div>
  )
}

export default TransactionPool

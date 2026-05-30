import React, { Component } from 'react'

import { Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import Transaction from './Transaction'

import globalConfig from '../../config'

const POLL_INERVAL_MS = 10000

class TransactionPool extends Component {
  constructor(props) {
    super(props)
    this.state = { transactionPoolMap: {} }
  }

  componentDidMount() {
    this.fetchTransactionPoolMap()

    this.fetchPoolMapInterval = setInterval(
      () => this.fetchTransactionPoolMap(),
      POLL_INERVAL_MS
    )
  }

  componentWillUnmount() {
    clearInterval(this.fetchPoolMapInterval)
  }

  fetchTransactionPoolMap = () => {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/transaction-pool-map`)
      .then(response => response.json())
      .then(json => this.setState({ transactionPoolMap: json }))
  }

  fetchMineTransactions = () => {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/mine-transactions`)
      .then(response => {
        if (response.status === 200) {
          alert('success')
        } else {
          alert('The mine-transactions block request did not complete.')
        }
      })
  }

  render() {
    const { transactionPoolMap } = this.state
    return (
      <div className="TransactionPool">
        <div><Link to="/">Home</Link></div>
        <h3>Transaction Pool</h3>
        {
          Object.values(transactionPoolMap).map(transaction => (
            <div key={transaction.uuid}>
              <hr />
              <Transaction transaction={transaction} />
            </div>
          ))
        }
        <hr />
        <Button
          bsstyle="danger"
          onClick={this.fetchMineTransactions}>
          Mine the Transactions
        </Button>
      </div>
    )
  }
}

export default TransactionPool

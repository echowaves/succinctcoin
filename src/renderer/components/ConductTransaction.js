import React, { Component } from 'react'
import { FormGroup, FormControl, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import Account from '../../main/blockchain/account'
import globalConfig from '../../config'

class ConductTransaction extends Component {
  constructor(props) {
    super(props)
    this.state = { recipient: '', amount: 0, knownAddresses: [] }
  }

  componentDidMount() {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/known-addresses`)
      .then(response => response.json())
      .then(json => this.setState({ knownAddresses: json }))
  }

  updateRecipient = event => {
    this.setState({ recipient: event.target.value })
  }

  updateAmount = event => {
    this.setState({ amount: Number(event.target.value) })
  }

  conductTransaction = () => {
    const { recipient, amount } = this.state
    const account = new Account().setHash({ hash: recipient }).retrieve()

    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/transact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: account.publicKey, amount }),
    }).then(response => response.json())
      .then(json => {
        alert(json.message || json.type)
      })
  }

  render() {
    const { knownAddresses, recipient, amount } = this.state
    return (
      <div className="ConductTransaction">
        <Link to="/">Home</Link>
        <h3>Conduct a Transaction</h3>
        <br />
        <h4>Known Addresses</h4>
        {
          knownAddresses.map(knownAddress => (
            <div key={knownAddress}>
              <div>{knownAddress}</div>
              <br />
            </div>
          ))
        }
        <br />
        <FormGroup>
          <FormControl
            input="text"
            placeholder="recipient"
            value={recipient}
            onChange={this.updateRecipient}
          />
        </FormGroup>
        <FormGroup>
          <FormControl
            input="number"
            placeholder="amount"
            value={amount}
            onChange={this.updateAmount}
          />
        </FormGroup>
        <div>
          <Button
            bsstyle="danger"
            onClick={this.conductTransaction}>
            Submit
          </Button>
        </div>
      </div>
    )
  }
}

export default ConductTransaction

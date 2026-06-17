import React, { useState, useEffect, useCallback } from 'react'
import { FormGroup, FormControl, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import Account from '../../main/blockchain/account'
import globalConfig from '../../config'

function ConductTransaction() {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState(0)
  const [knownAddresses, setKnownAddresses] = useState([])

  useEffect(() => {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/known-addresses`)
      .then(response => response.json())
      .then(json => setKnownAddresses(json))
  }, [])

  const conductTransaction = useCallback(() => {
    const account = async () => new Account({ publicKey: '' }).setHash({ hash: recipient }).retrieve()

    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/transact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: account.publicKey, amount }),
    }).then(response => response.json())
      .then(json => {
        alert(json.message || json.type)
      })
  }, [recipient, amount])

  return (
    <div className="ConductTransaction">
      <Link to="/">Home</Link>
      <h3>Conduct a Transaction</h3>
      <br />
      <h4>Known Addresses</h4>
      {knownAddresses.map(knownAddress => (
        <div key={knownAddress}>
          <div>{knownAddress}</div>
          <br />
        </div>
      ))}
      <br />
      <FormGroup>
        <FormControl
          input="text"
          placeholder="recipient"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
        />
      </FormGroup>
      <FormGroup>
        <FormControl
          input="number"
          placeholder="amount"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
      </FormGroup>
      <div>
        <Button
          bsstyle="danger"
          onClick={conductTransaction}>
          Submit
        </Button>
      </div>
    </div>
  )
}

export default ConductTransaction

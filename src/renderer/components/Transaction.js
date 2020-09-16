import React from 'react'
import PropTypes from 'prop-types'
import Crypto from '../../main/util/crypto'

const Transaction = ({ transaction }) => {
  const {
    sender, recipient, amount, fee,
  } = transaction

  return (
    <div className="Transaction">
      <div>From: `${Crypto.hash(sender).substring(0, 20)}... | Balance:??? ${amount}`</div>
      <div>
        To: `${Crypto.hash(recipient).substring(0, 20)}... | Sent: ${amount} | Fee: ${fee}`
      </div>
    </div>
  )
}

Transaction.propTypes = {
  transaction: PropTypes.object.isRequired,
}

export default Transaction

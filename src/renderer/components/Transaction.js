import React from 'react'

import Crypto from '../../main/util/crypto'

/**
 * @param {Object} props
 * @param {Object} props.transaction
 * @returns {JSX.Element}
 */
const Transaction = ({ transaction }) => {
  const {
    sender, recipient, amount, fee,
  } = transaction

  return (
    <div className="Transaction">
      <div>From: {Crypto.hash(sender).substring(0, 30)}... </div>
      <div>To: {Crypto.hash(recipient).substring(0, 30)}... </div>
      <div>Amount: {amount}    Fee: {fee}</div>
    </div>
  )
}

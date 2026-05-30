import React, { useState, useCallback, useMemo } from 'react'
import { Button } from 'react-bootstrap'

import Transaction from './Transaction'

function Block({ block }) {
  const [displayTransaction, setDisplayTransaction] = useState(false)

  const dataDisplay = useMemo(() => {
    const stringifiedData = JSON.stringify(block.data)
    return stringifiedData.length > 35
      ? `${stringifiedData.substring(0, 35)}...`
      : stringifiedData
  }, [block.data])

  const toggleTransaction = useCallback(() => {
    setDisplayTransaction(prev => !prev)
  }, [])

  const hashDisplay = `${block.hash.substring(0, 15)}...`

  return (
    <div className="Block">
      <div>Hash: {hashDisplay}</div>
      <div>Timestamp: {new Date(block.timestamp).toLocaleString()}</div>
      {displayTransaction ? (
        <div>
          {block.data.map(transaction => (
            <div key={transaction.uuid}>
              <hr />
              <Transaction transaction={transaction} />
            </div>
          ))}
          <br />
          <Button
            bsstyle="danger"
            bssize="small"
            onClick={toggleTransaction}>
            Show Less
          </Button>
        </div>
      ) : (
        <div>
          <div>Data: {dataDisplay}</div>
          <Button
            bsstyle="danger"
            bssize="small"
            onClick={toggleTransaction}>
            Show More
          </Button>
        </div>
      )}
    </div>
  )
}

export default Block

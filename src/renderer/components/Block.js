import React, { Component } from 'react'
import { Button } from 'react-bootstrap'
import PropTypes from 'prop-types'
import Transaction from './Transaction'

class Block extends Component {
  constructor(props) {
    super(props)
    this.state = { displayTransaction: false }
  }

  get displayTransaction() {
    const { block: { data } } = this.props
    const { displayTransaction } = this.state

    const stringifiedData = JSON.stringify(data)

    const dataDisplay = stringifiedData.length > 35
      ? `${stringifiedData.substring(0, 35)}...`
      : stringifiedData

    if (displayTransaction) {
      return (
        <div>
          {
            data.map(transaction => (
              <div key={transaction.uuid}>
                <hr />
                <Transaction transaction={transaction} />
              </div>
            ))
          }
          <br />
          <Button
            bsstyle="danger"
            bssize="small"
            onClick={this.toggleTransaction}>
            Show Less
          </Button>
        </div>
      )
    }

    return (
      <div>
        <div>Data: {dataDisplay}</div>
        <Button
          bsstyle="danger"
          bssize="small"
          onClick={this.toggleTransaction}>
          Show More
        </Button>
      </div>
    )
  }

  toggleTransaction = () => {
    const { displayTransaction } = this.state

    this.setState({ displayTransaction: !displayTransaction })
  }

  render() {
    const { block: { timestamp, hash } } = this.props

    const hashDisplay = `${hash.substring(0, 15)}...`

    return (
      <div className="Block">
        <div>Hash: {hashDisplay}</div>
        <div>Timestamp: {new Date(timestamp).toLocaleString()}</div>
        {this.displayTransaction}
      </div>
    )
  }
}

Block.propTypes = {
  block: PropTypes.object.isRequired,
}

export default Block

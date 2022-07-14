import React, { Component } from 'react'
import fetch from 'electron-fetch'

import { Link } from 'react-router-dom'
// import logo from '../../static/assets/logo.png'

import globalConfig from '../../config'
// <img className="logo" alt="succinct logo" src={logo}/> 

class App extends Component {
  constructor(props) {
    super(props)
    this.state = { walletInfo: {} }
  }

  componentDidMount() {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/wallet-info`)
      .then(response => response.json())
      .then(json => {
        this.setState({ walletInfo: json })
      })
  }

  render() {
    const { state: { walletInfo: { address, balance } } } = this

    return (
      <div className="App">
        <br />
        <div>
          Welcome to the blockchain...
        </div>
        <br />
        <div><Link to="/blocks">Blocks</Link></div>
        <div><Link to="/conduct-transaction">Conduct a Transaction</Link></div>
        <div><Link to="/transaction-pool">Transaction Pool</Link></div>
        <br />
        <div className="WalletInfo">
          <div>Address: {address}</div>
          <div>Balance: {balance}</div>
        </div>
      </div>
    )
  }
}

export default App

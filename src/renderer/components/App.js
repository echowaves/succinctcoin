import React, { useEffect, useState } from 'react'

// const { ipcRenderer } = require('electron')

const {ipcRenderer} = window

import { Link } from 'react-router-dom'


const App = () => {  
  const [walletInfo, setWalletInfo] = useState(null)
  const [address, setAddress] = useState(null)
  const [balance, setBalance] = useState(null)

  useEffect( () => {  
      const walletInfo = ipcRenderer.sendSync('/api/wallet-info')
      console.log({walletInfo})
      // alert({walletInfo})
      setWalletInfo(walletInfo)  
      setAddress(walletInfo?.address)
      setBalance(walletInfo?.balance)
  }, [])// eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div className="App">
        <img className="logo" alt="succinct logo" src="../static/assets/logo.png"/> 

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
        <div>{`Address: ${address}`}</div>
        <div>{`Balance: ${balance}`}</div>
        </div>

      </div>
    )
}

export default App


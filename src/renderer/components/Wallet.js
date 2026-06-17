import React, { useEffect, useState } from 'react'

const { electronAPI } = window

import '../App.css'

const Wallet = () => {
  const [walletInfo, setWalletInfo] = useState(null)
  const [address, setAddress] = useState(null)
  const [balance, setBalance] = useState(null)

  useEffect( () => {
    setWalletInfo(electronAPI.sendSync('/api/wallet-info'))
  }, [])

  useEffect( () => {
    console.log({ walletInfo })

    setAddress(walletInfo?.address)
    setBalance(walletInfo?.balance)
  }, [walletInfo])

  return (
    <div className="WalletInfo">
      <div>{`Address: ${address}`}</div>
      <div>{`Balance: ${balance}`}</div>
    </div>
  )
}

export default Wallet

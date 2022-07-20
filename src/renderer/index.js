import React from 'react'

import { createRoot } from "react-dom/client";

// import isDev from "electron-is-dev"

import {
  HashRouter,
  Routes, 
  Route,
} from "react-router-dom"

import App from './components/App'
// import Blocks from './components/Blocks'
// import ConductTransaction from './components/ConductTransaction'
// import TransactionPool from './components/TransactionPool'

import './index.css'

console.log('!!!!!!!!!!!!!!!!!!!!!!!!! renderer !!!!!!!!!!!!!!!!!!!!!!!!!!!')
const rootElement = document.getElementById("root")
const root = createRoot(rootElement)

root.render(
    <HashRouter>
      <Routes>
        <Route path="/" exact element={<App/>} >
          {/*<Route path="/blocks" element={<Blocks/>} />*/}
        </Route>
      </Routes>
    </HashRouter>
  )


// <Route path="/conduct-transaction" component={ConductTransaction} />
// <Route path="/transaction-pool" component={TransactionPool} />

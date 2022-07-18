import React from 'react'

import { createRoot } from "react-dom/client";

// import isDev from "electron-is-dev"

import {
  MemoryRouter,
  Routes, 
  Route,
} from "react-router-dom"


import App from './components/App'
// import Blocks from './components/Blocks'
// import ConductTransaction from './components/ConductTransaction'
// import TransactionPool from './components/TransactionPool'

import './index.css'

console.log('!!!!!!!!!!!!!!!!!!!!!!!!! loading !!!!!!!!!!!!!!!!!!!!!!!!!!!')
const rootElement = document.getElementById("root")
const root = createRoot(rootElement)

root.render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<App/>} >
          {/*<Route path="/blocks" element={<Blocks/>} />*/}
        </Route>
      </Routes>
    </MemoryRouter>
  )


// <Route path="/conduct-transaction" component={ConductTransaction} />
// <Route path="/transaction-pool" component={TransactionPool} />

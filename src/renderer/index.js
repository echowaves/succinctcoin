import * as React from 'react'
import * as ReactDOM from 'react-dom'

import {
  BrowserRouter as Router,
  Route,
  Routes, 
} from "react-router-dom"


import App from './components/App'
import Blocks from './components/Blocks'
import ConductTransaction from './components/ConductTransaction'
import TransactionPool from './components/TransactionPool'

import './index.css'

console.log('!!!!!!!!!!!!!!!!!!!!!!!!! loading !!!!!!!!!!!!!!!!!!!!!!!!!!!')

function render() {
  ReactDOM.render(
    <Router>
      <Routes>
        <Route exact path="/" component={App} />
        <Route path="/blocks" component={Blocks} />
        <Route path="/conduct-transaction" component={ConductTransaction} />
        <Route path="/transaction-pool" component={TransactionPool} />
      </Routes>
    </Router>,
    document.body
  )
}

render()
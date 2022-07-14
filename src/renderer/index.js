import * as React from 'react'
import * as ReactDOM from 'react-dom'

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Routes, 
} from "react-router-dom"


import App from './components/App'
import Blocks from './components/Blocks'
import ConductTransaction from './components/ConductTransaction'
import TransactionPool from './components/TransactionPool'
import './index.css'

function render() {
  ReactDOM.render(
    <Router>
      <Routes>
        <Switch>
          <Route exact path="/" component={App} />
          <Route path="/blocks" component={Blocks} />
          <Route path="/conduct-transaction" component={ConductTransaction} />
          <Route path="/transaction-pool" component={TransactionPool} />
        </Switch>
      </Routes>
    </Router>,
    document.body
  )
}

render()
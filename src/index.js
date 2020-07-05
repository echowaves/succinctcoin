import React from "react"
import { render, } from 'react-dom'

import { HashRouter, Switch, Route, } from 'react-router-dom'
import App from './components/App'
import Blocks from './components/Blocks'
import ConductTransaction from './components/ConductTransaction'
import TransactionPool from './components/TransactionPool'
import './index.css'

render(
  <HashRouter>
    <Switch>
      <Route exact path="/" component={App} />
      <Route path="/blocks" component={Blocks} />
      <Route path="/conduct-transaction" component={ConductTransaction} />
      <Route path="/transaction-pool" component={TransactionPool} />
    </Switch>
  </HashRouter>,
  document.getElementById('root')
)

import React from 'react'
import { render, } from 'react-dom'
import { BrowserRouter, Switch, Route, } from 'react-router-dom'
import history from './history'
import App from './components/App'
import Blocks from './components/Blocks'
import ConductTransaction from './components/ConductTransaction'
import TransactionPool from './components/TransactionPool'
import './index.css'

render(
  <BrowserRouter history={history}>
    <Switch>
      <Route exact path="/" component={App} />
      <Route path="/blocks" component={Blocks} />
      <Route path="/conduct-transaction" component={ConductTransaction} />
      <Route path="/transaction-pool" component={TransactionPool} />
    </Switch>
  </BrowserRouter>,
  document.getElementById('root')
)

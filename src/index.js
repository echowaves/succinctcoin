import React from 'react'
import { render, } from 'react-dom'
import { BrowserRouter, Switch, Route, } from 'react-router-dom'
import history from './react/history'
import App from './react/components/App'
import Blocks from './react/components/Blocks'
import ConductTransaction from './react/components/ConductTransaction'
import TransactionPool from './react/components/TransactionPool'
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

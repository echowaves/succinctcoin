import React, { useEffect, useState } from 'react'

import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom"

import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import { LinkContainer } from 'react-router-bootstrap';

import { Link } from 'react-router-dom'

import Wallet from "./components/Wallet.js"

import './App.css'

const Home = () => <span>Home 1</span>;

const About = () => <span>About 2</span>;

const Users = () => <span>Users 3</span>;


const App = () => { 
    return (
      <HashRouter>
        <Container className="p-3"> 
          <Container className="p-5 mb-4 bg-light rounded-3">
            
            <h1><img className="logo" alt="succinct logo" src="../static/assets/logo.png"/> succinct coin</h1>
            
            <h2>
              <ButtonToolbar className="custom-btn-toolbar">
                <LinkContainer to="/">
                  <Button>Wallet</Button>
                </LinkContainer>
                <LinkContainer to="/about">
                  <Button>About</Button>
                </LinkContainer>
                <LinkContainer to="/users">
                  <Button>Users</Button>
                </LinkContainer>
              </ButtonToolbar>
            </h2>
            <div className="App">
            <Routes>
              <Route path="/" element={<Wallet />}/>
              <Route path="/about" element={<About />}/>
              <Route path="/users" element={<Users />}/>
            </Routes>
            </div>
          </Container>
        </Container>
      </HashRouter>
    )
}

export default App

// <Routes>
// <Route path="/" exact element={<App/>} >
//   {/*<Route path="/blocks" element={<Blocks/>} />*/}
// </Route>
// </Routes>

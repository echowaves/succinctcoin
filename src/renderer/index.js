import React from 'react'
import { createRoot } from "react-dom/client";

import App from './App'

// Importing the Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

console.log('!!!!!!!!!!!!!!!!!!!!!!!!! renderer !!!!!!!!!!!!!!!!!!!!!!!!!!!')
const rootElement = document.getElementById("root")
const root = createRoot(rootElement)

root.render(<App />)

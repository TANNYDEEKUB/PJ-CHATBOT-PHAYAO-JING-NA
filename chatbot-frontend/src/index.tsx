import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';
import './index.css'


const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!); // ใช้ createRoot กับ React 18

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

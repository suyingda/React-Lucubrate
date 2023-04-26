import * as React from 'react'
import * as  ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'));
// console.log(root);
// debugger;
root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
)

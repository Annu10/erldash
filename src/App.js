import React from 'react';
import './App.css';
require('dotenv').config();

function App() {
  return (
    <div style={{backgroundColor: "#f08a06"}}>
      <header className="App-header">
        <p>
          Butler Server Dashboards
        </p>
      </header>
      <body>
      <ul>
          <li><a
          className="App-link"
          href="localhost:3000/health_dashboard"
          target="_blank"
          rel="noopener noreferrer"
        >
          Health DashBoard
        </a></li>
        </ul>
      </body>
    </div>

  );
}

export default App;

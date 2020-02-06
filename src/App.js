import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Welcome to Butler Server dashboard
        </p>
        <a
          className="App-link"
          href="localhost:3000/health_dashboard"
          target="_blank"
          rel="noopener noreferrer"
        >
          Health DashBoard
        </a>
        <a
          className="App-link"
          href="localhost:8181/pick_viewer.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pick Viewer
        </a>
        <a
          className="App-link"
          href="localhost:8181/put_viewer.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Put Viewer
        </a>
        <a
          className="App-link"
          href="localhost:3000/notfound"
          target="_blank"
          rel="noopener noreferrer"
        >
          NotFound
        </a>
      </header>
    </div>

  );
}

export default App;

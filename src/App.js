import React from 'react';
import logo from './logo.svg';
import './App.css';
// import Tree from 'react-d3-tree';

// const myTreeData = [
//   {
//     name: 'Top Level',
//     attributes: {
//       keyA: 'val A',
//       keyB: 'val B',
//       keyC: 'val C',
//     },
//     children: [
//       {
//         name: 'Level 2: A',
//         attributes: {
//           keyA: 'val A',
//           keyB: 'val B',
//           keyC: 'val C',
//         },
//       },
//       {
//         name: 'Level 2: B',
//       },
//     ],
//   },
// ];

// class MyComponent extends React.Component {
//   render() {
//     return (
//       <div id="treeWrapper" style={{width: '50em', height: '20em'}}>

//         <Tree data={myTreeData} />

//       </div>
//     );
//   }
// }

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
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
          href="./test.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Test Html
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
      </header>
    </div>

  );
}

export default App;

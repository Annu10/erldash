import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Link, NavLink, Switch } from 'react-router-dom'
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import HealthDashBoardComponent from './health_dashboard'
import Notfound from './notfound.js'
//ReactDOM.render(<App />, document.getElementById('root'));

const routing = (
    <Router>
    <div>
      <h1>Butler Server DashBoard</h1>
      <ul>
        <li>
          <NavLink to="/" exact activeStyle={
             {color:'red'}
          }>Home</NavLink>
        </li>
        <li>
          <NavLink to="/health_dashboard" exact activeStyle={
             {color:'green'}
          }>Health DashBoard</NavLink>
        </li>
        <li>
          <NavLink to="/contact" exact activeStyle={
             {color:'magenta'}
          }>Contact</NavLink>
        </li>
      </ul>
      <Switch>
         <Route exact path="/" component={App} />
         <Route exact path="/health_dashboard" component={HealthDashBoardComponent} />
         <Route component={Notfound} />
      </Switch>
    </div>
  </Router>
  )
//
ReactDOM.render(routing, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

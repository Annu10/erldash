import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom'
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import HealthDashBoardComponent from './health_dashboard'
import Notfound from './notfound.js'


//for addition of any new tool,just Add its Link and Route its new component
const routing = (
  <Router>
    <div>
      <p style ={{visibility :"hidden", width:"0px", height:"0px"}}>
      <Link to="/" exact style={
             {color:'red'}
          }>Home</Link>
          <Link to="/health_dashboard" exact style={
             {color:'green'}
          }>Health DashBoard</Link>
          <Link to="/contact" exact style={
             {color:'magenta'}
          }>Contact</Link>
      </p>
      <Switch>
         <Route exact path="/" component={App} />
         <Route exact path="/health_dashboard" component={HealthDashBoardComponent} />
         <Route component={Notfound} />
      </Switch>
    </div>
  </Router>
  )
ReactDOM.render(routing, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

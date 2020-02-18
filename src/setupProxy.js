const proxy = require('http-proxy-middleware');
const express = require('express');
const path = require('path');

module.exports = function set_proxy_ips(app){
  var hdbBackendBaseUrl = process.env.REACT_APP_HDB_BACKEND_BASE_URL;
  if(process.env.REACT_APP_HDB_PROXY =="ENABLED"){
        if(typeof hdbBackendBaseUrl !=="undefined"){
            targetVar = hdbBackendBaseUrl;
        }
        else{
            //default value in case of not present in .env
            hdbBackendBaseUrl = "http://localhost:8181/"
        }
        app.use(
            '/healthmon',
            proxy({
            target: hdbBackendBaseUrl,
            changeOrigin: true,
            })
        );
  //For any future new tool which may use different backend base url than localhost, just add its new config
  //in .env file and add proxy for that ip like above for it
  }
};

import React from 'react'
import Tree from 'react-d3-tree';
import ReactTooltip from 'react-tooltip'

import "../src/css/health_dash_styles.css";

var globalNumOfFetch =0;
var globalAppTag ="all";
var globalHealthTag = "bad";//default bad health to render only problematic nodes on load,later you can select any
var globalApplicationNames = [];
var healthTagList = ["all","bad","good","exited"];

var offSetVar ={
  top: 0,
  left : 0
}

const treeNodeStyle ={
  color: "Black",
  height : "100%",
  width : "100%",
  fontFamily: "Arial",
  textAlign : "center",
  overflow :"auto",
};

const toolTipContentStyle ={
  color: "White",
  height : "100%",
  width : "100%",
  fontFamily: "Arial",
  overflowY :"auto",
  top: 38,
  zIndex : 2
  //top: 0
};

const zoomExtent ={
  min : 0.1,
  max :5
}

const nodeSizeVar = {
  x : 220, //
  y :210//140
}

const svgShapeRectBlue = {
  shape : 'rect',
  shapeProps: {
    width: 10,
    height: 8,
    fill: 'blue' // "#00A86B"
  }
}

const svgShapeCircleBlue = {
  shape : 'circle', // making a leaf node shape-default ie. circle
  shapeProps: {
    r: 5,
    fill :'blue'
  }
}
const svgShapeCircleRed = {
  shape : 'circle', // making a leaf node shape-default ie. circle
  shapeProps: {
    r: 6,
    fill :'red'
  }
}

const svgShapeRectRed = {
  shape : 'rect',
  shapeProps: {
    width: 10,
    height: 8,
    fill :'red'
  }
}

const sepVar = {
  siblings: 1,
  nonSiblings: 1
}

const emptyTree =[{
  name :"system",
  attributes :{
    app_name :"undefined", pid : "undefined", health :"good", node : "undefined", update_time : "", current_function : "",
    type : "system", stack_size : "", reductions : "", total_heap_size : "", message_queue_len : "", namespace : "universal"
  },
  nodeSvgShape : svgShapeCircleBlue
}]

class HealthDashBoardComponent extends React.Component {
  constructor() {
    super();
    this.state = { supTreeData: false ,enableQry :false, qryString : "", auto_refresh:false};
    this.qryString2 = React.createRef();
    this.getHealthMonInfo = this.getHealthMonInfo.bind(this);
    this.handleAppFilter = this.handleAppFilter.bind(this);
    this.handleHealthFilter= this.handleHealthFilter.bind(this);
    this.handleQryEnable = this.handleQryEnable.bind(this);
    this.handleAutoRefresh = this.handleAutoRefresh.bind(this);
    this.handleQrySubmit = this.handleQrySubmit.bind(this);
    }

    componentDidUpdate() {
      ReactTooltip.rebuild()
    }
    componentDidMount(){
      this.getHealthMonInfo();
    }

    getHealthMonInfo() {
      var treeData;
      //http://localhost:8181/healthmon/information
      var url = "healthmon/information";
      if(globalAppTag !=="all"){
        url = url +"?app="+globalAppTag;
      }
      if(globalHealthTag !=="all" && globalAppTag!=="all"){
        url = url +"&health="+globalHealthTag;
      }else if(globalHealthTag !=="all" && globalAppTag==="all"){
        url = "healthmon/information?health="+globalHealthTag;
      }

      fetch(url,{mode : "no-cors", method:"GET" })
        .then(res => res.json())
        .then(
          (result) => {
            if(typeof result ==="undefined"){
            }else{
              //stringify ensures no api timeout on large json response
              treeData = JSON.stringify(result);
            }
            this.setState({
              supTreeData:  treeData
            });
          },
          (error) => {
            console.log("API ERROR");
          }
        )
    }

    handleAppFilter(e){
      globalAppTag = e.target.value;
      this.getHealthMonInfo();
    }


    handleHealthFilter(e){
      globalHealthTag = e.target.value;
      this.getHealthMonInfo();
    }

    handleQryEnable(){
      //on query disable ,qryString should be cleared-DONE
      if(this.state.enableQry){
        this.setState({
          qryString:  ""
        });
      }
      this.setState({
        enableQry:  !this.state.enableQry
      });
    }

    handleAutoRefresh(){
      if(!this.state.auto_refresh){
        this.timer = setInterval(()=> this.getHealthMonInfo(), 30*1000);//TODO seconds to be made config based or ui based
      }else{
        this.timer = clearInterval(this.timer);
      }
      this.setState({
        auto_refresh:  !this.state.auto_refresh
      });
    }

    handleQrySubmit(e) {
      if(this.state.enableQry){
        console.log("qry was"+e.target.elements.qry.value);
      this.setState({
        qryString:  e.target.elements.qry.value
      });
      e.preventDefault();
      }

    }


  render() {
      //on load only, after that depending on refresh interval or filter/query etc
      if(globalNumOfFetch<=1){
        this.getHealthMonInfo();
        getApplicationInfo();
        globalNumOfFetch = 2;
      }
      var appHeader;

      appHeader   = (<div style ={{textAlign:"center"}}>
                      <h2>Butler Server Health DashBoard!!!</h2>
                      </div>);
      var app_list_var,health_list_var;

      var app_names_var = Object.keys(globalApplicationNames).map(function(app_name) {
          return (<option >{app_name}</option>);
      });

      app_list_var =(<select onChange = {this.handleAppFilter}><option>all</option>{app_names_var}</select>);
      var healthListExpectSelected =  Object.keys(healthTagList).map(function(key) {
        var health = healthTagList[key];
        if(health!==globalHealthTag){
        return (<option >{health}</option>);
        }
    });
      health_list_var =(<select onChange = {this.handleHealthFilter}><option>{globalHealthTag}</option>{healthListExpectSelected}
      </select>);

      var supTreeData = this.state.supTreeData;
      var supTreeDataVar = false;
      var qryString = this.state.qryString;

      if(supTreeData !== false){
      var rawTreeJson = convertToJson(supTreeData);
      var finalD3Tree = getEnhancedD3Tree(rawTreeJson, qryString);
      if(finalD3Tree.length==0 || typeof finalD3Tree=="undefined"){
        //empty tree result
        finalD3Tree = emptyTree;
      }

        supTreeDataVar = (
          <div>
              <div id="treeWrapper" style={{width: '200em', height: '400em'}}>
              <Tree data-tip data-for='myTreeId' data={finalD3Tree} orientation="vertical" transitionDuration="0"
              scaleExtent ={zoomExtent} separation={sepVar} pathFunc="diagonal" nodeSize ={nodeSizeVar}
                  allowForeignObjects
                        nodeLabelComponent={{
                          render: <NodeLabel className='TreeNodeToolTip' />,
                          foreignObjectWrapper: {
                            y:0,
                            x:-90 //controls alignment of foreignObject Nodes with respect to the node
                            //height : 100,
                            //width :100
                          }
                        }}
                ></Tree>
              </div>
          </div>
          );

    }
    else{
      //tree not loaded yet
    }

    return (
      <div>
        {appHeader}
          <p style ={{marginLeft: "40px"}}>
              Select App:&nbsp;&nbsp;
                  {app_list_var}
                &nbsp;&nbsp;
                Select Health:&nbsp;&nbsp;

                  {health_list_var}
                  &nbsp;&nbsp;
                  <input type="checkbox"
                  checked={this.state.enableQry}
                  ref="enableQry"
                  onChange= {this.handleQryEnable} />
                  Enable Query{'                '}
                  <form onSubmit={this.handleQrySubmit} style={{display:"inline"}} disabled={!this.enableQry? "disabled" : false}>
                  <input type="text" placeholder ={this.state.qryString} name="qry"/>
                  <input type="submit" value="Search Subtree"/>
                  </form>
                  {'                '}
                  <input type="checkbox"
                  checked={this.state.auto_refresh}
                  ref="auto_refresh"
                  onChange= {this.handleAutoRefresh} />
                  {''} Auto Refresh
                  &nbsp;&nbsp;<b><a data-tip data-for='appTips'>App Tips</a></b>
          <ReactTooltip id='appTips' type='info' effect='solid' place ='right'>
          <p>Butler Server Health DashBoard Tool Tips</p>
            <ul>
              <li>Select App to filter tree for specific apps</li>
              <li>Select Health to filter tree for specific health</li>
              <li>Enable Query,input desired process name and hit Search Subtree to get branches of that process only
                ,disable Query to clear it
              </li>
              <li>Red Nodes indicate node or its any subtree in bad health</li>
              <li>Blue Nodes indicate node and all its subtrees in good health</li>
              <li>Rectangular nodes have children, circular nodes are leaf</li>
              <li>Hover on Node Name to see more details of the node</li>
              <li>Click on nodes to expand/collapse immediate children</li>
              <li>Whole Tree can be dragged & zoomed in-out</li>
            </ul>
          </ReactTooltip>
                </p>

      {supTreeDataVar}

      </div>
    );
  }
}

function convertToJson(str){
  var result = JSON.parse(str);
  return result;
}

function getEnhancedD3Tree(InputJson, qry){
  var result =[];
  if(typeof InputJson ==="undefined"){
    result = emptyTree;
    return result;
  }else if( InputJson ===""){
    result = emptyTree;
    return result;
  }
  Object.keys(InputJson).forEach(function(key) {
    var value = InputJson[key];
    if(qry ==""){
      result.push(transformTreeJsonToD3TreeObject(value));
    }
    else{
      var resultTree = transformSubTreeJsonToD3TreeObject(value, qry);
        if(resultTree!==null){
          result.push(resultTree);
        }
    }
  });

  return result;
}

//for foreignObject of TreeNodes
class NodeLabel extends React.PureComponent {
  render() {
    const {className, nodeData} = this.props
    return (
      <div>
        <TreeNodeToolTip id={nodeData.id}
        namespace ={nodeData.attributes.namespace} type ={nodeData.attributes.type}
        health = {nodeData.attributes.health} name = {nodeData.name}
        current_function = {nodeData.attributes.current_function}
        reductions = {nodeData.attributes.reductions}
        stack_size = {nodeData.attributes.stack_size}
        total_heap_size = {nodeData.attributes.total_heap_size}
        update_time = {nodeData.attributes.update_time}
        message_queue_len = {nodeData.attributes.message_queue_len}
        />
            <div style ={treeNodeStyle}>
            app_name: {nodeData.attributes.app_name}<br/>
            pid: {nodeData.attributes.pid}<br/>
            health: {nodeData.attributes.health}<br/>
            node: {nodeData.attributes.node}<br/>
        </div>
      </div>
    )
  }
}

/*
TODO has  problem of self node update within library
       {nodeData._children  &&
          <button onClick ={expandOrCollapseAll(nodeData)}>{nodeData._collapsed ? '+' : '-'}</button>}
*/

//TODO...not using this but may use
function expandOrCollapseAll(nodeData){
  if(nodeData._collapsed==true){
    expandAllSubTree(nodeData);
  }
  else{
    //nodeData._collapsed =true;
    collapseAllSubTree(nodeData);

  }
}
function expandAllSubTree(nodeData){
  nodeData._collapsed =false;
    if(nodeData._children){
    nodeData._children.forEach(function(d) {
      d._collapsed = false;
      expandAllSubTree(d);
    });
    }
}

function collapseAllSubTree(nodeData){
  nodeData._collapsed =true;
  if(nodeData._children){
  nodeData._children.forEach(function(d) {
    d._collapsed = true;
    collapseAllSubTree(d);
  });
  }

}

class TreeNodeToolTip extends React.Component{
  constructor(props){
    super();
    this.state = { name: props.name ,health : props.health,id : props.id, namespace :props.namespace,
    type :props.type, current_function: props.current_function, reductions: props.reductions, stack_size: props.stack_size,
    total_heap_size: props.total_heap_size, update_time: props.update_time, message_queue_len: props.message_queue_len
    };
    }

  render() {
    var name = this.state.name;
    var health = this.state.health;
    var id = this.state.id;
    var namespace = this.state.namespace;
    var type = this.state.type;
    var current_function = this.state.current_function;
    var reductions = this.state.reductions;
    var stack_size = this.state.stack_size;
    var total_heap_size = this.state.total_heap_size;
    var update_time = this.state.update_time;
    var message_queue_len = this.state.message_queue_len;

    var toolType ='info';
    if(health !== "good"){
      toolType = 'error'
    }
    return (
    <div>
      <b><p style={{textAlign: 'center'}}><a data-tip data-for={id}> {name}</a></p></b>

          <ReactTooltip  data-offset={offSetVar}
          delayHide={300}  clickable ={true} type={toolType} scrollHide ={true} effect='solid' place ='bottom' id={id}>
          <div style ={toolTipContentStyle}>
            <li>update_time:{update_time}</li>
            <li>current_function:{current_function}</li>
            <li>type:{type} ,stack_size: {stack_size}, reductions:{reductions}</li>
            <li>total_heap_size: {total_heap_size}</li>
            <li>message_queue_len: {message_queue_len}</li>
            <li>namespace: {namespace}</li>
          </div>
          </ReactTooltip>
    </div>
    );
  }
}


  function transformTreeJsonToD3TreeObject(InputJson){
    var childrenVar =[];
    var root =[];
    if(typeof InputJson.children !== "undefined"){
      Object.keys(InputJson.children).forEach(function(key) {
        var value = InputJson.children[key];
        childrenVar.push(transformTreeJsonToD3TreeObject(value));
      });
    }
    root = makeD3TreeNode(InputJson, childrenVar);
    return root;
  }


  function transformSubTreeJsonToD3TreeObject(InputJson, qry){
    var childrenVar =[];
    var root =[];
    var isAnySubTreeRelevant = false;
    var nameVar = InputJson.name;
    var appNameVar =InputJson.attributes.app_name;
    if(typeof InputJson.children !== "undefined"){
      Object.keys(InputJson.children).forEach(function(key) {
        var value = InputJson.children[key];
        if(nameVar.includes(qry) || appNameVar.includes(qry)){
          //qry node found,now get all children of this node
          childrenVar.push(transformTreeJsonToD3TreeObject(value));
          isAnySubTreeRelevant = true;
        }
        else{
          var subTreeResult = transformSubTreeJsonToD3TreeObject(value, qry);
          if(subTreeResult!==null){
              childrenVar.push(subTreeResult);
              isAnySubTreeRelevant = true;
          }
          else{
            //skip
          }
        }
      });
    }
    if(nameVar.includes(qry) || isAnySubTreeRelevant || appNameVar.includes(qry)){
      root = makeD3TreeNode(InputJson, childrenVar);
      return root;
    }else{
      return null;
    }
  }

  function makeD3TreeNode(InputJson, childrenVar){
    var root =[];
    var nameVar = InputJson.name;
    var attributesVar = {};
    var isBadHealth = false;
    if(typeof InputJson.attributes !== "undefined"){
      attributesVar =  {
        pid: InputJson.attributes.pid,
        name: InputJson.attributes.name,
        app_name: InputJson.attributes.app_name,
        node: InputJson.attributes.node,
        namespace : InputJson.attributes.namespace,
        type: InputJson.attributes.type,
        health: InputJson.attributes.health,
        current_function: InputJson.attributes.current_function,
        reductions: InputJson.attributes.reductions,
        stack_size: InputJson.attributes.stack_size,
        total_heap_size: InputJson.attributes.total_heap_size,
        update_time: InputJson.attributes.update_time
      }
      if(InputJson.attributes.health !== "good"){
        isBadHealth = true;
      }
      nameVar = InputJson.attributes.name;
    }
    var shapeVar;
    if(isBadHealth && childrenVar.length !==0){
      shapeVar = svgShapeRectRed;
    }
    else if(childrenVar.length ==0 && !isBadHealth){
      shapeVar = svgShapeCircleBlue;
    }else if(childrenVar.length ==0 && isBadHealth){
      shapeVar = svgShapeCircleRed;
    }
    else{
      shapeVar = svgShapeRectBlue;
    }
    if(attributesVar ===[]){
      root = {
        name : InputJson.name,
        children : childrenVar
      }
    }else{
      root = {
        name : nameVar,
        attributes : attributesVar,
        nodeSvgShape: shapeVar,
        children : childrenVar
      }
    }
    return root;
  }


function  getApplicationInfo(){
    var url = "healthmon/which_applications";
    console.log("url was "+url);
    fetch(url,{mode : "no-cors", method:"GET" })
      .then(res => res.json())
      .then(
        (result) => {
          if(typeof result ==="undefined"){
            result= {};
          }else{
            globalApplicationNames = result;
          }
        },
        (error) => {
          console.log("API ERROR");
        }
      )

  }

export default HealthDashBoardComponent
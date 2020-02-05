import React from 'react'
import Tree from 'react-d3-tree';
import ReactTooltip from 'react-tooltip'

import "../src/css/health_dash_styles.css";

var globalNumOfFetch =0;
var globalAppTag ="all";
var globalHealthTag = "bad";//default bad health to render only problematic nodes on load,later you can select any
var globalApplicationNames = [];
var healthTagList =["all","bad","good","exited"];

var offSetVar ={
  top: 0,
  left : -10
}

const treeNodeStyle ={
  color: "Black",
  height : "100%",//"180px",
  width : "100%",//"200px",
  fontFamily: "Arial",
  textAlign : "center",
  overflow :"auto"
};

const zoomExtent ={
  min : 0.1,
  max :5
}

const nodeSizeVar = {
  x : 220, //by this we are able to handle overlaps ,at the cost of more width of overall tree
  y :210//140
}

const svgShapeRectBlue = {
  shape : 'rect',
  shapeProps: {
    width: 10,
    height: 8,
    fill: 'blue' // "#00A86B" green here doesnt seem useful as for small node ,hard to distinguish with red
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
//TODO will remove later
var globalCount =0;

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
        globalCount++;
        var treeData;
        //TODO have to change url on iteg
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
        //var url = "api/get_health_data/"+globalAppTag+"/"+globalHealthTag;
        console.log("url was "+url);
        fetch(url,{mode : "no-cors", method:"GET" })
          .then(res => res.json())
          .then(
            (result) => {
              console.log("api hit success!!!"+result+" , called "+globalCount+"th time");
              if(typeof result ==="undefined"){
              }else{
                treeData = JSON.stringify(result);
                //console.log("!!!!result json NOT undefined in getHealthMonInfo within api hit and = "+treeData);
                console.log("api result json not undefined");

                console.log("testing result values "+Object.keys(result));
                console.log("stringify version");
              }
              this.setState({
                supTreeData:  treeData
              });
            },
            // Note: it's important to handle errors here
            // instead of a catch() block so that we don't swallow
            // exceptions from actual bugs in components.
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
    //Working!!! calls controlled by refresh click button ,for now(TODO)
      var welcomeMsg;

      welcomeMsg   = (<div style ={{textAlign:"center"}}>
                      <h3>Butler Server Health DashBoard!!!</h3>
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


      //var newTree = getTheTree(butlerTreeJson);
      //console.log("supTree Data now = "+supTreeData);
      globalCount++;
      //if(globalCount >6 && supTreeData != false){
      if(supTreeData !== false){
      var formattedTree2 = convertToJsObject(supTreeData);
      console.log("formatted Tree 2 ="+formattedTree2);
      //var formattedTree = getTheTree(formattedTree2);

      //testing subtree function
      //Worksssss
      var formattedTree = getTheSubTree(formattedTree2, qryString);// have made its return type empty list
      //in case no match for query,when the tree resulted was null actually
      if(formattedTree.length==0 || typeof formattedTree=="undefined"){
        console.log("formattedTree is undefined till now");
        supTreeDataVar =(<div style={{textAlign:"center"}}><h2>Empty Tree for params App: {globalAppTag}&nbsp;&nbsp;
        Health :{globalHealthTag}&nbsp;&nbsp; search query:{this.state.qryString}
        </h2></div>);
      }else{
        //main code
        supTreeDataVar = (
          <div>
              <div id="treeWrapper2" style={{width: '200em', height: '400em'}}>
              <Tree data-tip data-for='myTreeId' data={formattedTree} orientation="vertical" transitionDuration="0"
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
    }
    else{
      //tree not loaded yet
    }

    return (
      <div>
        {welcomeMsg}
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
              <li>Enable Query,and input desired process name to get branches of that process only</li>
              <li>Red Nodes indicate node or its any subtree in bad health</li>
              <li>Blue Nodes indicate node and all its subtrees in good health</li>
              <li>Rectangular nodes have children, circular nodes are leaf</li>
              <li>Hover on Node Name see more details of the node</li>
              <li>Click on nodes to expand/collapse immediate children</li>
              <li>Whole Tree is draggable zoomable</li>
            </ul>
          </ReactTooltip>
                </p>

      {supTreeDataVar}

      </div>
    );
  }
}

function convertToJsObject(str){
  var result = JSON.parse(str);
  return result;
}


function getTheTree(InputJson){
  var result =[];
  //console.log("Object size= "+Object.length(InputJson));
  if(typeof InputJson ==="undefined"){
    console.log("Input json  is undefined in getTheTree ");
  }else if( InputJson ===""){
    console.log("Input json empty  in getTheTree ");
  }
  else{
    console.log("InputJSon NOT undefined in getTheTree and = "+InputJson);
  }
  var i=0;
  //JSON.parse(InputJson)
  Object.keys(InputJson).forEach(function(key) {
    i++;
    console.log("i ="+i+" and key was "+key);
    var value = InputJson[key];
    //thedata = value;
    //console.log("key was "+key+ " value was "+value);
    if(typeof value ==="undefined"){
      console.log("value  is undefined in getTheTree ");
    }else{
      console.log("value NOT undefined in getTheTree and = "+value);
    }
    //get this child's subtree
    result.push(transformTreeJsonToObject2(value));
  });
  console.log("outside input json for loop");
  return result;
}


function getTheSubTree(InputJson, qry){
  var result =[];
  //console.log("Object size= "+Object.length(InputJson));
  if(typeof InputJson ==="undefined"){
    console.log("Input json  is undefined in getTheTree ");
  }else if( InputJson ===""){
    console.log("Input json empty  in getTheTree ");
  }
  else{
    console.log("InputJSon NOT undefined in getTheTree and = "+InputJson);
  }
  var i= 0;
  //JSON.parse(InputJson)
  Object.keys(InputJson).forEach(function(key) {
    i++;
    console.log("i ="+i+" and key was "+key);
    var value = InputJson[key];
    //thedata = value;
    //console.log("key was "+key+ " value was "+value);
    if(typeof value ==="undefined"){
      console.log("value  is undefined in getTheTree ");
    }else{
      console.log("value NOT undefined in getTheTree and = "+value);
    }
    //get this child's subtree
    var resultTree = transformSubTreeJsonToObject2(value, qry);
    if(resultTree!==null){
    result.push(resultTree);
    }
  });
  console.log("outside input json for loop");
  return result;
}

//for foreignObject of TreeNodes
class NodeLabel extends React.PureComponent {
  render() {
    const {className, nodeData} = this.props
    return (
      <div>
        <TreeNodeToolTip id={nodeData.id} app_name ={nodeData.attributes.app_name} pid = {nodeData.attributes.pid}
        namespace ={nodeData.attributes.namespace} type ={nodeData.attributes.type}
        health = {nodeData.attributes.health} name = {nodeData.name}
        current_function= {nodeData.attributes.current_function}
        reductions= {nodeData.attributes.reductions}
        stack_size= {nodeData.attributes.stack_size}
        total_heap_size= {nodeData.attributes.total_heap_size}
        update_time= {nodeData.attributes.update_time}
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
TODO has  problem of self node update
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
    this.state = { name: props.name ,health : props.health, pid : props.pid, id : props.id,
    app_name : props.app_name, namespace :props.namespace, node: props.node, type :props.type,
    current_function: props.current_function,
    reductions: props.reductions,
    stack_size: props.stack_size,
    total_heap_size: props.total_heap_size,
    update_time: props.update_time
    };
    }


  render() {
    var name = this.state.name;
    var health = this.state.health;
    var pid = this.state.pid;
    var id = this.state.id;
    var app_name = this.state.app_name;
    var namespace = this.state.namespace;
    var node = this.state.node;
    var type = this.state.type;
    var current_function= this.state.current_function;
    var reductions = this.state.reductions;
    var stack_size= this.state.stack_size;
    var total_heap_size= this.state.total_heap_size;
    var update_time= this.state.update_time;

    var toolType ='info';
    if(health !== "good"){
      toolType = 'error'
    }
    return (
    <div>
      <b><p style={{textAlign: 'center'}}><a data-tip data-for={id}> {name}</a></p></b>

          <ReactTooltip data-offset={offSetVar}
          delayHide={300}  clickable ={true} type={toolType} effect='solid' place ='bottom' id={id}>
            <li>update_time:{update_time}</li>
            <li>current_function:{current_function}</li>
            <li>type:{type} ,stack_size: {stack_size}, reductions:{reductions}</li>
            <li>total_heap_size: {total_heap_size}</li>
            <li>namespace: {namespace}</li>
          </ReactTooltip>
    </div>
    );
  }
}


//TODO : maybe remove this function and make use with overloaded function with empty string passed value
  function transformTreeJsonToObject2(InputJson){
    var childrenVar =[];
    if(typeof InputJson.children !== "undefined"){
      console.log("children was not undefined");
      Object.keys(InputJson.children).forEach(function(key) {
        var value = InputJson.children[key];
        childrenVar.push(transformTreeJsonToObject2(value));
      });
    }

    var attributesVar = {};
    var colorVar = 'blue';
    var isBadHealth = false;
    var nameVar = InputJson.name;
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
    var result =[];
    if(attributesVar ===[]){
      result = {
        name : InputJson.name,
        children : childrenVar
      }
    }else{
      result = {
        name : nameVar,
        attributes : attributesVar,
        nodeSvgShape: shapeVar,
        children : childrenVar
      }
    }
    return result;
  }


  function transformSubTreeJsonToObject2(InputJson, qry){
    var childrenVar =[];
    var isAnySubTreeRelevant = false;
    var nameVar = InputJson.name;
    var appNameVar =InputJson.attributes.app_name;
    if(typeof InputJson.children !== "undefined"){
      console.log("children was not undefined");
      Object.keys(InputJson.children).forEach(function(key) {
        var value = InputJson.children[key];
        //thedata = value;
        //console.log("key was "+key+ " value was "+value);
        //add this child subtree
        console.log("current name var ="+nameVar+" qry = "+qry);
        if(nameVar.includes(qry) || appNameVar.includes(qry)){
          console.log("a clear match");
          childrenVar.push(transformTreeJsonToObject2(value));
          isAnySubTreeRelevant = true;
        }
        else{
          var subTreeResult = transformSubTreeJsonToObject2(value, qry);
          if(subTreeResult!==null){
              console.log("oki here");
              childrenVar.push(subTreeResult);
              isAnySubTreeRelevant = true;
          }
          else{
            //skip
          }
        }
      });
    }

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
    var result =[];
    if(attributesVar ===[]){
      result = {
        name : InputJson.name,
        children : childrenVar
      }
    }else{
      result = {
        name : nameVar,
        attributes : attributesVar,
        nodeSvgShape: shapeVar,
        children : childrenVar
      }

    }
    if(nameVar.includes(qry) || isAnySubTreeRelevant || appNameVar.includes(qry)){
      return result;
    }else{
      return null;
    }

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
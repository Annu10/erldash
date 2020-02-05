/*jslint browser: true, indent: 2, vars: true*/
/*global define*/

define(["jquery", "d3", "underscore", "jquery-ui"], function ($, d3, _) {
  "use strict";

  $.ajaxSetup({
    cache: false
  });
  Object.size = function (obj) {
    var size = 0,
      key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        size = size + 1;
      }
    }
    return size;
  };

  var username = "admin";
  var password = "gorapj";

  var rightbar_size = 195;
  var rightbar_space = 15;

  var g_width = $(window).width() - 50 - rightbar_size;
  var g_height = $(window).height() - 80;

  var tile_width = 50;
  var tile_height = 50;

  var tile_xspace = 10;
  var tile_yspace = 20;

  var tile_stroke = 1;

  var timeout = 1000;
  var transition_duration = 200;

  var g_mapdict = [{}, {}];
  var g_mapcoordidx = [{}, {}];
  var g_mapdata = [[], []];
  var g_botdata = [[], []];
  var g_botindex = [{}, {}];
  var g_rackdata = [[], []];
  var g_rackindex = [{}, {}];
  var g_sysinfo = [[], []];

  var mapdict = g_mapdict[0];
  var mapcoordidx = g_mapcoordidx[0];
  var mapdata = g_mapdata[0];
  var botdata = g_botdata[0];
  var botindex = g_botindex[0];
  var rackdata = g_rackdata[0];
  var rackindex = g_rackindex[0];
  var sysinfo = g_sysinfo[0];

  var svg_out;
  var svg;

  var historical_data = {};
  var history_list = [];

  var tslider;
  var playing = true;
  var keyframe;
  var current_changeset = 0;
  var cf_timeout;
  var websocket;
  var count=1;

  var heat_map = false;

  function send_heat_map_flag(heat_map_flag){
    var packet = {
          "event":"set_config",
          "items": [{
            "key": "d3_heat_map",
            "value": heat_map_flag,
            "type": "boolean"
          }]
        };
    websocket.send(JSON.stringify(packet));
  };

  function request_location_scores(){
    var packet = {
      "event": "storable_location_scores"
    };
    websocket.send(JSON.stringify(packet));
  };

  /**
   * Start map on dom ready
   */

  $(function () {
    $("#info_box").width(rightbar_size - rightbar_space);
    $("#heat_map_source").change(function(){
        var heat_map_type = $("#heat_map_source").val();
        if(heat_map_type === "none") {
            console.log("Turning off heat map");
            heat_map = false;
            send_heat_map_flag(false);
            refresh_racks();
        }else if(heat_map_type === "rack"){
            console.log("Turning on racks heat map");
            heat_map = "racks";
            swal("Rack colours in increasing popularity:", "Red, Orange, Yellow, Green, Cyan, Blue, Purple");
            send_heat_map_flag(true);
            refresh_racks();
        }else if(heat_map_type === "location"){
            console.log("Turning on location heat map");
            heat_map = "location";
            swal("Location colours in increasing popularity:", "Red, Orange, Yellow, Green, Cyan, Blue, Purple");
            request_location_scores();
        };
    });

    $("#seekfirstbutton").button({
        icons: {
            primary: "ui-icon-seek-first"
        },
        text: false
    }).click(function()
    {
      
        console.log(tslider.slider("option","value"));
       
        
    });
    $("#playbackbutton").button({
        icons: {
            primary: "ui-icon-pause"
        },
        text: false
    }).click(function () {
      var options;
      if(playing) {
        window.clearTimeout(cf_timeout);
        playing = false;
        var new_value;
        if(keyframe === undefined) {
          new_value = tslider.slider("option", "value") - 2;
        }
        else {
          new_value = tslider.slider("option", "value") - 1;
        }
        if(new_value < 0) {
          new_value = 0;
        }
        //console.log(history_list);
        //console.log(new_value);
        keyframe = history_list[new_value];
        tslider.slider("value", new_value+1);
        options = {
          icons: {
            primary: "ui-icon-play"
          }
        };
      }
      else {
        frame_loop();
        playing = true;
        options = {
          icons: {
            primary: "ui-icon-pause"
            }
        };
      }
      $( this ).button( "option", options );
    });
    $("#seekendbutton").button({
        icons: {
            primary: "ui-icon-seek-end"
        },
        text: false
    });

    $("#ok_button").click( function(){
    var new_value=document.getElementById("command_input").value;
        //console.log(typeof(new_value));
        var first=new_value.split(":");
        //console.log(first);
        var mod=first[0];
        mod=mod.match(/\S+/g);
        mod=mod[0];
        //console.log("mod is ",mod);
        var rest=first[1];
        var second=rest.split("(");
        var fun=second[0];
        fun=fun.match(/\S+/g);
        fun=fun[0];
        //console.log(fun);
        rest=second[1];
        var third=rest.split(")");
        third=third[0]; // the list of arguments 
        //console.log("list of arguments",third);
        var arg__list=third.split(",");
        //console.log("list of arguments separated",arg__list);
        var arg___list=[]
        for (var val in arg__list)
        {
          arg__list[val]=arg__list[val].match(/\S+/g);
          arg__list[val]=arg__list[val][0];
          var converted=Number(arg__list[val]);
          if (isNaN(converted))
          {
             var res = arg__list[val].substr(1,7);
             //console.log(res);
             arg___list.push(res.toString());
          }
          else
          {
           
            arg___list.push(converted);
          }
          

        }

        var arg=arg___list;
        //console.log("final converted list",arg);

        var packet={
          "event":"function",
          "module":mod,
          "function":fun,
          "arguments":arg

        };

        console.log(packet);
        websocket.send(JSON.stringify(packet));
        //console.log("message_sent");

      });


  

    $("#command_input").click(function()
    {       
        var commandJson={
            "event": "whitelist"
              
            };
        websocket.send(JSON.stringify(commandJson));

        //console.log("from here");

       
        
    })

    

    tslider = $("#timeslider").slider({
      min: 1,
      max: history_list.length + 1,
      value: history_list.length + 1,
      slide: function( event, ui ) {
        window.clearTimeout(cf_timeout);
        console.log(ui.value);
        var keyframe_idx = ui.value-1;
        keyframe = history_list[keyframe_idx];
        if(keyframe === undefined) {
          g_mapdict[0] = $.extend(true, {}, g_mapdict[1]);
          g_mapcoordidx[0] = $.extend(true, {}, g_mapcoordidx[1]);
          g_mapdata[0] = $.extend(true, [], g_mapdata[1]);
          g_botdata[0] = $.extend(true, [], g_botdata[1]);
          g_botindex[0] = $.extend(true, {}, g_botindex[1]);
          g_rackdata[0] = $.extend(true, [], g_rackdata[1]);
          g_rackindex[0] = $.extend(true, {}, g_rackindex[1]);
          g_sysinfo[0] = $.extend(true, [], g_sysinfo[1]);
        }
        else {
          current_changeset = 0;

          g_mapdict[0] = $.extend(true, {}, historical_data[keyframe].state.mapdict);
          g_mapcoordidx[0] = $.extend(true, {}, historical_data[keyframe].state.mapcoordidx);
          g_mapdata[0] = $.extend(true, [], historical_data[keyframe].state.mapdata);
          g_botdata[0] = $.extend(true, [], historical_data[keyframe].state.botdata);
          g_botindex[0] = $.extend(true, {}, historical_data[keyframe].state.botindex);
          g_rackdata[0] = $.extend(true, [], historical_data[keyframe].state.rackdata);
          g_rackindex[0] = $.extend(true, {}, historical_data[keyframe].state.rackindex);
          g_sysinfo[0] = $.extend(true, [], historical_data[keyframe].state.sysinfo);
        }

        mapdict = g_mapdict[0];
        mapcoordidx = g_mapcoordidx[0];
        mapdata = g_mapdata[0];
        botdata = g_botdata[0];
        botindex = g_botindex[0];
        rackdata = g_rackdata[0];
        rackindex = g_rackindex[0];
        sysinfo = g_sysinfo[0];

        if(playing) {
          frame_loop();
        }
      }
    });
    $("#timeslider").width($(window).width() - $("#buttonsbox").width() - 100);
    setSliderTicks();
    setup_websocket();
  });



  function start_playback_from_current_changeset () {
    frame_loop();
  }
        
  function frame_loop () {
    if(keyframe === undefined) {
      console.log("Reached the present");
      playing = true;
      keyframe = undefined;
      current_changeset = 0;
      return;
    }
    var keyframe_obj = historical_data[keyframe];
    var data = keyframe_obj.changesets[current_changeset];
    apply_changeset(data, 0);

    current_changeset = current_changeset + 1;
    if(current_changeset >= keyframe_obj.changesets.length) {
      // change keyframe
      var keyframe_idx = _.indexOf(history_list, keyframe_obj.id) + 1;
      if(keyframe_idx >= history_list.length) {
        // reached the present
        console.log("Reached the present");
        playing = true;
        keyframe = undefined;
        current_changeset = current_changeset - 1;
        tslider.slider("value", keyframe_idx+1);
        return;
      }
      keyframe = history_list[keyframe_idx];
      keyframe_obj = historical_data[keyframe];
      current_changeset = 0;
      tslider.slider("value", keyframe_idx+1);
    }
    var next_data = keyframe_obj.changesets[current_changeset];
    var time_diff = next_data.time.getTime() - data.time.getTime();
    cf_timeout = window.setTimeout(frame_loop, time_diff);
  }

  function apply_changeset (data, g_idx) {
    if (data.type === "rackdata") {
        handle_racks_data([data.data], true, g_idx);
      } else if (data.type === "butlerdata") {
        data.debug_vars = [];
        handle_butlers_data([data.data], true, g_idx);
      } else if (data.type === "reservationdata") {
        if (data.data.coordinate in g_mapcoordidx[g_idx]) {
          g_mapdata[g_idx][g_mapcoordidx[g_idx][data.data.coordinate]].res_status = data.data.reservation_type;
        }
      } else if (data.type === "sysinfo") {
        handle_sys_info(data.data, g_idx);
      }  else if (data.type === "whitelist") {
        //console.log("whitelist data is ", data.data);
        whitelist_handler(data.data);
        
      } else if (data.type === "storable_location_scores"){
        var ScoreData = JSON.parse(data.data);
        for(var key in ScoreData){
            var this_index = "["+g_mapdict[g_idx][key].toString()+"]";
            g_mapdata[g_idx][g_mapcoordidx[g_idx][this_index]].location_score = ScoreData[key];
        };
        refresh_racks(); // Refresh racks to revert back rack popularity (if on before)
        render();
      }
        
       else {
        console.log("Unknown data = ", data.data);
        count++;
        if (data.data[0]=="result" && count%2==0)
        {

          var result=data.data[1];
          alert("Result : "+result);
        }
    }
    mapdict = g_mapdict[0];
    mapcoordidx = g_mapcoordidx[0];
    mapdata = g_mapdata[0];
    botdata = g_botdata[0];
    botindex = g_botindex[0];
    rackdata = g_rackdata[0];
    rackindex = g_rackindex[0];
    sysinfo = g_sysinfo[0];

  }

  function whitelist_handler(data){
    //console.log("called");
        var total_list=data;
        var sugg_list=[]
        for (var key in total_list)
        {
          var obj=total_list[key];
          var mod=obj[0];
          var fun=obj[1];
          var arg_list=obj[2];
          var arg_list_sugg=arg_list.join(",");
          
          var sugg=mod+":"+fun+"("+arg_list_sugg+")";
          sugg_list.push(sugg);
          //console.log(sugg);
          //console.log(mod,fun,arg_list);
          //console.log("(",arg_list_sugg,")");

        }
        //console.log(sugg_list);
        $( "#command_input" ).autocomplete({
          source:sugg_list
        });
        
  }

  function setSliderTicks(){
    var max = tslider.slider("option", "max");
    var spacing =  100 / (max -1);

    tslider.find('.ui-slider-tick-mark').remove();
    for (var i = 0; i < max ; i++) {
        $('<span title="'+history_list[i]+'" class="ui-slider-tick-mark"></span>').css('left', (spacing * i) +  '%').appendTo(tslider);
     }
  }

  function keyed_time(time) {
    return time.getFullYear() + "-" + ('0'+(time.getMonth()+1)).slice(-2) + "-" + ('0'+time.getDate()).slice(-2) +
            "T" + ('0'+time.getHours()).slice(-2) + ":" + ('0'+time.getMinutes()).slice(-2);
  }

  function setup_websocket() {
    var urlParts = document.location.href.split("/");
    websocket = new WebSocket("ws://" + urlParts[2] + "/ws");
    websocket.onopen = function (evt) {
      onWSOpen(evt);
    };
    websocket.onclose = function (evt) {
      onWSClose(evt);
    };
    websocket.onmessage = function (evt) {
      onWSMessage(evt);
    };
    websocket.onerror = function (evt) {
      onWSError(evt);
    };
  }

  function onWSOpen(evt) {
    $("#messagebar").text("Connected to server");
    d3.select("svg").remove();
    send_heat_map_flag((heat_map !== false));
    auth_send();
  }

  function onWSClose(evt) {
    $("#messagebar").text("Disconnected from server. Trying again...");
    setTimeout(setup_websocket, 1000);
  }

  function onWSMessage(evt) {
    //console.log(evt.data);
    var data = JSON.parse(evt.data);
    data.time = new Date(data.time);
    var time_min = keyed_time(data.time);

    if(history_list.length === 0 || time_min > _.last(history_list)) {
      
      if(history_list.length>document.getElementById("STACK").innerHTML)
      {
        while(history_list.length > 0 && history_list.length > document.getElementById("STACK").innerHTML)
        {
          history_list.shift();
        }
        

      }
      history_list.push(time_min);
      if(!playing && keyframe === undefined) {
        keyframe = time_min;
      }

      historical_data[time_min] = {
        "id": time_min,
        "state": {
          "mapdict": $.extend(true, {}, g_mapdict[1]),
          "mapcoordidx": $.extend(true, {}, g_mapcoordidx[1]),
          "mapdata": $.extend(true, [], g_mapdata[1]),
          "botdata": $.extend(true, [], g_botdata[1]),
          "botindex": $.extend(true, {}, g_botindex[1]),
          "rackdata": $.extend(true, [], g_rackdata[1]),
          "rackindex": $.extend(true, {}, g_rackindex[1]),
          "sysinfo": $.extend(true, [], g_sysinfo[1])
        },
        "changesets": []
      };
      tslider.slider("option", "max", history_list.length+1);
      if(playing && keyframe === undefined) {
        tslider.slider("value", history_list.length+1);
      }
      setSliderTicks();
    }

    var length = historical_data[time_min].changesets.push(data);
    if(playing && keyframe === undefined) {
      current_changeset = length - 1;
      apply_changeset(data, 0);
    }
    apply_changeset(data, 1);
    //console.log(playing, keyframe, historical_data);
  }

  function onWSError(evt) {
    // console.log(evt);
  }

  function auth_send() {
    var authreq = {
        "event":"auth",
        "event_data":{
            "username":username,
            "password":password
        }
    };
    
    websocket.send(JSON.stringify(authreq));
    websocket.onmessage = function (evnt) {
        auth_response(evnt);
    };
  }

  function auth_response(evt) {
    var data = JSON.parse(evt.data);
    var type = data.type;
    if(type == "auth") {
      if(data.data == "OK"){
        refresh_map();
      }
    }
  }

  function refresh_map() {
    var mapreq = {
        "event":"map",
        "event_data":{
        }
    };
    websocket.send(JSON.stringify(mapreq));
    websocket.onmessage = function (evnt) {
        refresh_map_response(evnt);
    };
  }

  function refresh_map_response(evnt) {
    var data1 = JSON.parse(evnt.data);
    var type = data1.type;
    if(type == "map") {
      var keysData = data1.data;
      // mapdict = {};
      // mapcoordidx = {};
      // mapdata = [];
      var maxx = 1;
      var maxy = 1;
      var minx = 99999;
      var miny = 99999;
      var idx;
      keysData.forEach(function (data) {
        data.coord = JSON.parse(data.coordinate);
        data.res_status = "empty";
        idx = mapdata.push(data) - 1;
        mapdict[data.barcode] = data.coord;
        mapcoordidx[data.coordinate] = idx;

        if (data.coord[0] > maxx) {
          maxx = data.coord[0];
        }
        if (data.coord[1] > maxy) {
          maxy = data.coord[1];
        }
        if (data.coord[0] < minx) {
          minx = data.coord[0];
        }
        if (data.coord[1] < miny) {
          miny = data.coord[1];
        }

      });

      g_mapdict[1] = $.extend(true, {}, mapdict);
      g_mapcoordidx[1] = $.extend(true, {}, mapcoordidx);
      // g_mapdata[1] = $.extend(true, [], mapdata);

      var max_width = (maxx + 2) * (tile_width + tile_xspace);
      var max_height = tile_yspace + (maxy + 2) * (tile_height + tile_yspace);

      var trans_x = (minx - 1/2) * (tile_width + tile_xspace);
      var trans_y = - (miny - 1/2) * (tile_height + tile_yspace);

      if (max_width < g_width) {
        g_width = max_width;
      }
      if (max_height < g_height) {
        g_height = max_height;
      }

      svg_out = d3.select("#mapbox")
        .append("svg")
        .attr("width", g_width)
        .attr("height", g_height);

      svg_out.append("rect")
        .attr("x", 1)
        .attr("y", 1)
        .attr("width", g_width - 2)
        .attr("height", g_height - 2)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", "1");

      svg = svg_out.append("g")
        .call(d3.behavior.zoom().scaleExtent([0.65, 1.6]).on("zoom", zoom))
        .attr("transform", "translate(" + trans_x + ", " + trans_y + ")")
        .append("g");

      svg.append("rect")
        .attr("class", "overlay")
        .attr("width", g_width)
        .attr("height", g_height);

      refresh_pps();
    };
  }

  function refresh_pps() {
    var ppsreq = {
        "event":"pps",
        "event_data":{
        }
    };
    websocket.send(JSON.stringify(ppsreq));
    websocket.onmessage = function (evnt) {
        refresh_pps_response(evnt);
    };
  }

  function refresh_pps_response(evnt) {
    var data1 = JSON.parse(evnt.data);
    var type = data1.type;
    if(type == "pps") {
      var ppsData = data1.data;
      var x, y;
      ppsData.forEach(function (data) {
        // data.pick_coord = mapdict[data.pick_position];
        // x = data.pick_coord[0];
        // y = data.pick_coord[1];
        // if(data.pick_direction == 0) {
        //   y = y-1;
        // }
        // else if(data.pick_direction == 1) {
        //   x = x-1;
        // }
        // else if(data.pick_direction == 2) {
        //   y = y+1;
        // }
        // else if(data.pick_direction == 3) {
        //   x = x+1;
        // }
        // else {
        //   console.log("ERROR!!!");
        // }
        // var obj = {'coord': [x,y], 'barcode': 'PPS #'+data.pps_id};
        // mapdata.push(obj);
        // mapdict['PPS #'+data.pps_id] = [x,y];

        mapdata.forEach(function (element) {
          if (element.barcode === data.pick_position) {
            element.is_pick_position = true;
          }
        });

        g_mapdata[1] = $.extend(true, [], mapdata);

      });
      refresh_chargers();
    };
  }


  function refresh_chargers() {
    var chargersreq = {
        "event":"chargers",
        "event_data":{
        }
    };
    websocket.send(JSON.stringify(chargersreq));
    websocket.onmessage = function (evnt) {
        refresh_chargers_response(evnt);
    };
  }

  function refresh_chargers_response(evnt) {
    var data1 = JSON.parse(evnt.data);
    var type = data1.type;
    if(type == "chargers") {
      var chargers = data1.data;
      var x, y;
      chargers.forEach(function (data) {
        mapdata.forEach(function (element) {
          if (element.barcode === data.charger_location) {
            element.is_charger_location = true;
          }
        });

        g_mapdata[1] = $.extend(true, [], mapdata);

      });
      refresh_racks();
    };
  }


  function refresh_reservations() {
    var resreq = {
        "event":"reservations",
        "event_data":{
        }
    };
    websocket.send(JSON.stringify(resreq));
    websocket.onmessage = function (evnt) {
        refresh_reservations_response(evnt);
    };
  }

  function refresh_reservations_response(evnt){
    var data1 = JSON.parse(evnt.data);
    var type = data1.type;
    if(type == "reservations") {
      var resvData = data1.data;
      mapdata.forEach(function (element) {
        if (resvData.turn.indexOf(element.coordinate) !== -1) {
          element.res_status = "turn";
        } else if (resvData.moving.indexOf(element.coordinate) !== -1) {
          element.res_status = "moving";
        } else if (resvData.idle.indexOf(element.coordinate) !== -1) {
          element.res_status = "idle";
        } else if (resvData.safety.indexOf(element.coordinate) !== -1) {
          element.res_status = "safety";
        } else {
          element.res_status = "empty";
        }
      });
      g_mapdata[1] = $.extend(true, [], mapdata);
      refresh_bots();
      // setTimeout(refresh_reservations, timeout);
    };
  }

  function refresh_bots() {
    var botreq = {
        "event":"bots",
        "event_data":{
        }
    };
    websocket.send(JSON.stringify(botreq));
    websocket.onmessage = function (evnt) {
        refresh_bots_response(evnt);
    };
  }

  function refresh_bots_response(evnt) {
    var data1 = JSON.parse(evnt.data);
    var type = data1.type;
    if(type == "bots") {
      var butlersData = data1.data;
      handle_butlers_data(butlersData, false, 0);
      handle_butlers_data(butlersData, false, 1);
      //setTimeout(refresh_bots, timeout);
      render();
      websocket.onmessage = function (evnt) {
          onWSMessage(evnt);
      };
    };
  }

  function handle_sys_info(sinfoData, g_idx) {
    // console.log(sinfoData);
    var idx = _.indexOf(_.find(g_sysinfo[g_idx], function (sinfo) {
      return (sinfo.si_key === sinfoData.si_key);
    }));
    if (idx < 0) {
      g_sysinfo[g_idx].push(sinfoData);
    } else {
      g_sysinfo[g_idx][idx] = sinfoData;
    }
  }

  function handle_butlers_data(butlersData, is_update, g_idx) {
    var present_bots = [];
    butlersData.forEach(function (data) {
      present_bots.push(data.id);
      if(!("debug_vars" in data)) {
        data.debug_vars = [];
      }
      var debug_data = $.map(data.debug_vars, function (v, k) {
        return [
          [k, v]
        ];
      });
      data.debug_vars = debug_data;
      if (data.position in g_mapdict[g_idx]) {
        data.coord = g_mapdict[g_idx][data.position];
        if (g_botindex[g_idx][data.id] === undefined) {
          var index = g_botdata[g_idx].push(data);
          g_botindex[g_idx][data.id] = index - 1;
        } else {
          var minimized = g_botdata[g_idx][g_botindex[g_idx][data.id]].minimized;
          data.minimized = minimized;
          g_botdata[g_idx][g_botindex[g_idx][data.id]] = data;
        }
      } else {
        $.getJSON("/api/map/index/barcode/" + data.position + "?convert=list", function (keys) {
          if (keys[0] === undefined) {
            data.coord = [0, 0];
          } else {
            g_mapdict[g_idx][data.position] = JSON.parse(keys[0]);
            data.coord = g_mapdict[g_idx][data.position];
          }
          if (g_botindex[g_idx][data.id] === undefined) {
            var index = g_botdata[g_idx].push(data);
            g_botindex[g_idx][data.id] = index - 1;
          } else {
            g_botdata[g_idx][g_botindex[g_idx][data.id]] = data;
          }
        });
      }
      data.size = [];
      for(var i=0; i<butlersData.length; i++) {
        var currentButler = butlersData[i];
        if(currentButler.error_desc == "no_error") {
          data.size[currentButler.id] = "small";
        }else{
          data.size[currentButler.id] = "large";
        }
      }
      var fontSize = $("body").css('font-size');
      var lineHeight = Math.floor(parseInt(fontSize.replace('px', '')) * 1.4);
      var numElements = 10;
      if(data.error_desc === "error" || data.error_desc === "no_error") {
        data.show_error_details = false;
      }
      else {
        data.show_error_details = true;
        numElements += 2;
      }
      if(data.butler_error_reason === 'undefined'){
        numElements = 8;
      }
      data.minimized_height = '20px';
      data.maximized_height = lineHeight*(numElements) + 'px';
      console.log(data.id, data.maximized_height);
      if(data.status==='error'||data.status==='initializing'){
        $("#butler_state_"+data.id).addClass("butler_error_present");

      }else{
        $("#butler_state_"+data.id).removeClass("butler_error_present");
      }
    });

    if (!is_update) {
      g_botdata[g_idx] = g_botdata[g_idx].filter(function (bd) {
        if (present_bots.indexOf(bd.id) === -1) {
          delete g_botindex[g_idx][bd.id];
          return false;
        } else {
          return true;
        }
      });
    }
  }

  function refresh_racks() {
    var racksreq = {
        "event":"racks",
        "event_data":{
        }
    };
    websocket.send(JSON.stringify(racksreq));
    websocket.onmessage = function (evnt) {
        refresh_racks_response(evnt);
    };
  }

  function refresh_racks_response(evnt) {
    var data1 = JSON.parse(evnt.data);
    var type = data1.type;
    if(type == "racks") {
      var racksData = data1.data;
      handle_racks_data(racksData, false, 0);
      handle_racks_data(racksData, false, 1);
      //setTimeout(refresh_racks, timeout);
      refresh_reservations();
    };
  }

  function handle_racks_data(racksData, is_update, g_idx) {
    var present_racks = [];
    racksData.forEach(function (data) {
      present_racks.push(data.id);
      if (data.position in g_mapdict[g_idx]) {
        data.coord = g_mapdict[g_idx][data.position];
        if (g_rackindex[g_idx][data.id] === undefined) {
          var index = g_rackdata[g_idx].push(data);
          g_rackindex[g_idx][data.id] = index - 1;
        } else {
          g_rackdata[g_idx][g_rackindex[g_idx][data.id]] = data;
        }
      } else {
        $.getJSON("/api/map/index/barcode/" + data.position + "?convert=list", function (keys) 
        {
          g_mapdict[g_idx][data.position] = JSON.parse(keys[0]);
          data.coord = g_mapdict[g_idx][data.position];
          if (g_rackindex[g_idx][data.id] === undefined) {
            var index = g_rackdata[g_idx].push(data);
            g_rackindex[g_idx][data.id] = index - 1;
          } else {
            g_rackdata[g_idx][g_rackindex[g_idx][data.id]] = data;
          }
        });
      }
      rackdata = g_rackdata[0]; // Resetting rackdata for rendering
      rackindex = g_rackindex[0];
    });

    if (!is_update) {
      g_rackdata[g_idx] = g_rackdata[g_idx].filter(function (rd) {
        if (present_racks.indexOf(rd.id) === -1) {
          delete g_rackindex[g_idx][rd.id];
          return false;
        } else {
          return true;
        }
      });
    }


  }

  function zoom() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }

  function render() {
    render_map_area();
    render_rightbar();
    setTimeout(render, timeout);
  }


  var menu = [
    {
      title: 'Ask to send init',
      action: function(elm, d, i) {
        var oneJson={
          "event": "user_command",
          "command": "send_init",
          "butler_id": d.id
        };
        websocket.send(JSON.stringify(oneJson));
      }
    },
    {
      title: 'Send to barcode',
      action: function(elm, d, i) {
        swal({
          title:"Send to barcode",
          text: "Please enter the barcode to send butler id: " + d.id,
          type: "input",   showCancelButton: true,
          closeOnConfirm: false,
          animation: "slide-from-top",
          inputPlaceholder: "Barcode" },
             function(inputValue){
               if (inputValue === false)
                 return false;
               if (inputValue === ""){
                 swal.showInputError("You need to write something!");
                 return false;
               }
               var twoJson={
                 "event": "user_command",
                 "command": "send_to_barcode",
                 "butler_id": d.id,
                 "barcode": inputValue
               };
               console.log(twoJson);
               websocket.send(JSON.stringify(twoJson));
               swal("Thank You!", "You Entered: " + inputValue, "success");
               return true;
             });
      }
    },
    {
      title: 'rackloop_start',
      action: function(elm, d, i) {
        var threeJson={
          "event": "user_command",
          "command": "rackloop_start",
          "butler_id": d.id
        };
        websocket.send(JSON.stringify(threeJson));
      }

    },
    {
      title: 'rackloop_stop',
      action: function(elm, d, i) {
        var fourJson={
          "event": "user_command",
          "command": "rackloop_stop",
          "butler_id": d.id
        };
        websocket.send(JSON.stringify(fourJson));
      }

    }
  ];


  function render_rightbar() {

    // sysinfo
    var sinfoTextTiles = d3.select("div#sinfo_list")
      .selectAll("div.sinfo")
      .data(sysinfo, function (d) {
        return d.si_key;
      });

    var sinfoTiles = sinfoTextTiles.enter().append("div").attr("class", "sinfo");

    sinfoTiles.append("span").attr("class", "sinfo_key");
    sinfoTiles.append("span").attr("class", "sinfo_value");

    var sinfoUpdates = sinfoTextTiles.transition().duration(transition_duration);

    sinfoUpdates.select("span.sinfo_key").text(function (d) {
      return d.si_key;
    });
    sinfoUpdates.select("span.sinfo_value")
      .text(function (d) {
        return d.si_val;
      });

    sinfoTextTiles.exit().remove();

    // Expand/Collapse buttons
    d3.select("button#binfoListExpand")
      .on("click", function() {
        botdata.forEach(function(data) {
          data.minimized = false;
          document.getElementById('binfoContent'+data.id).style.display='block';
          document.getElementById('binfoContent'+data.id).parentNode.style.height=data.maximized_height;
        });
      });
    d3.select("button#binfoListCollapse")
      .on("click", function() {
        botdata.forEach(function(data) {
          data.minimized = true;
          document.getElementById('binfoContent'+data.id).style.display='none';
          document.getElementById('binfoContent'+data.id).parentNode.style.height=data.minimized_height;
        });
      });

    // botdata
    var textTiles = d3.select("div#binfoList")
      .selectAll("div.binfo")
      .data(botdata.slice().sort(function(a, b) {return a.id - b.id;}), function (d, ind) {
        return d.id;
      });

    textTiles.on('contextmenu', d3.contextMenu(menu)); // attach menu to element

    var binfoTiles = textTiles.enter().append("div").attr("class", "binfo");

    textTiles.style("height", function(d) {
      if(d.minimized) {
        return d.minimized_height;
      }
      else {
        return d.maximized_height;
      }
    });

    var binfoToggleButton = binfoTiles.append("div").attr("class", "binfoToggleButton").attr("id", function (d) {
      return "binfoToggleButton"+d.id;
    });
    binfoToggleButton.append("span").attr("class", "butler_id").attr("id",function(d){
      return "butler_header_"+d.id
    });
    binfoToggleButton.append("span").attr("class", "butler_display_id").attr("id",function(d){
      return "butler_display_id"+d.id
    });
    binfoToggleButton.append("span").attr("class", "butler_state").attr("id",function(d){
      return "butler_state_"+d.id
    });

    d3.selectAll("div.binfoToggleButton")
      .data(botdata.slice().sort(function(a, b) {return a.id - b.id;}), function (d, ind) {
        return d.id;
      })
      .on("click", function(d) {
        if(d.minimized) {
          d.minimized = false;
          document.getElementById('binfoContent'+d.id).style.display='block';
          document.getElementById('binfoContent'+d.id).parentNode.style.height=d.maximized_height;
        }
        else {
          d.minimized = true;
          document.getElementById('binfoContent'+d.id).style.display='none';
          document.getElementById('binfoContent'+d.id).parentNode.style.height=d.minimized_height;
        }
      });

    var binfoContent = binfoTiles.append("div").attr("class", "binfoContent").attr("id", function (d) {
      return "binfoContent"+d.id;
    });

    binfoContent.append("span").attr("class", "butler_position");
    binfoContent.append("span").attr("class", "butler_direction");
    binfoContent.append("span").attr("class", "butler_current_status");
    binfoContent.append("span").attr("class", "butler_current_navstatus");
    binfoContent.append("span").attr("class", "butler_error_desc");
    binfoContent.append("span").attr("class", "dm_not_found");
    binfoContent.append("span").attr("class", "butler_current_task");
    binfoContent.append("span").attr("class", "butler_current_subtask");
    binfoContent.append("span").attr("class", "butler_deltas");
    binfoContent.append("span").attr("class", "butler_voltage");
    binfoContent.append("span").attr("class", "butler_power");
    binfoContent.append("span").attr("class", "butler_debug_vars");
    binfoContent.append("span").attr("class", "butler_address");
    binfoContent.append("span").attr("class", "server_error");
    binfoContent.append("span").attr("class", "butler_error_reason");
    binfoContent.append("span").attr("class", "butler_error_time");

    textTiles.select("span.butler_debug_vars")
      .html(function (d) {
        var out = "";
        d.debug_vars.forEach(function (vr) {
          out = out + vr[0] + ": " + vr[1] + "<br/>";
        });
        return out;
      });

    var binfoUpdates = textTiles.transition().duration(transition_duration);

    binfoUpdates.select("span.butler_id").text(function (d) {
      return d.id;
    });
    binfoUpdates.select("span.butler_state")
      .attr("class", function (d) {
        var state = d.state;
        if(d.butler_error_reason!='undefined'&&(d.status==='error'||d.status==='initializing')){
          state = state+" "+"butler_error_present";
        }
        if (d.state === "online") {
          return state + " butler_on";
        } else {
          return state + " butler_off";
        }
      })
      .text(function (d) {
        return d.state;
      });

    binfoUpdates.select("span.butler_position").text(function (d) {
      return d.position;
    });
    binfoUpdates.select("span.butler_direction").text(function (d) {
      return d.direction;
    });
    binfoUpdates.select("span.butler_current_status")
      .text(function (d) {
        if(d.paused) {
          return d.status + " (P)";
        }
        else {
          return d.status;
        }
      });
    binfoUpdates.select("span.butler_current_navstatus")
      .attr("class", function (d) {
        if (d.show_error_details) {
          return "butler_current_navstatus butler_off";
        }
        else {
          if(d.navstatus === "error" || d.navstatus === "warning") {
            return "butler_current_navstatus butler_off";
          }
          else {
            return "butler_current_navstatus";
          }
        }
      })
      .text(function (d) {
        return d.navstatus;
      });

    binfoUpdates.select("span.butler_error_desc")
      .text(function (d) {
        if (d.show_error_details) {
          var details = d.error_desc.split(".");
          var desc = details[0];
          var hex = details[1];
          var dm = details[2];
          $(".butler_error_desc").attr('title', "Hex: " + hex);
          return "[ " + desc + " ]";
        }
        return "";
      })
      .attr("style", function(d) {
        if (d.show_error_details) {
          return "display: inline";
        } else {
          return "display: none";
        }
      });
    binfoUpdates.select("span.dm_not_found")
      .text(function (d) {
        if (d.navstatus  === "error") {
          var details = d.error_desc.split(".");
          var dm = details[2];
          $(".dm_not_found").show();
          return dm;
        }
        return "";
      })
      .attr("style", function(d) {
        if (d.show_error_details) {
          return "display: inline";
        } else {
          return "display: none";
        }
      });
    binfoUpdates.select("span.butler_current_task")
      .text(function (d) {
        return d.tasktype;
      });
    binfoUpdates.select("span.butler_current_subtask")
      .text(function (d) {
        return d.current_subtask;
      });
    binfoUpdates.select("span.butler_deltas")
      .text(function (d) {
        return d.deltas;
      });
    binfoUpdates.select("span.butler_voltage")
      .text(function (d) {
        return d.voltage;
      });
    binfoUpdates.select("span.butler_power")
      .text(function (d) {
        console.log(d.power);
        return d.power;
      });
    binfoUpdates.select("span.butler_address")
      .text(function (d) {
        return d.address;
      });
    binfoUpdates.select("span.butler_display_id")
      .text(function (d) {
        if (d.display_id == "undefined")
            return "(-)";
        return "(" + d.display_id + ")";
    });
    binfoUpdates.select("span.butler_error_reason").text(function(d) {
      if(d.butler_error_reason === 'undefined')
        return '';
      return d.butler_error_reason;
    });
    binfoUpdates.select("span.butler_error_time").text(function(d) {
      if(d.butler_error_time === 'undefined')
        return '';
      var date = new Date(0);
      date.setUTCSeconds(d.butler_error_time);
      var dd = date.getDate();
      var MM = date.getMonth()+1;
      var yy = date.getFullYear();
      var hh = date.getHours();
      var mm = date.getMinutes();
      var ss = date.getSeconds();
      var error_time_formatted = yy + "-" + ('0' + MM).slice(-2) + "-" +
                                ('0'+dd).slice(-2) + " " + ('0'+hh).slice(-2) + ":" +
                                ('0'+mm).slice(-2) + ":" + ('0'+ss).slice(-2);
      return error_time_formatted;
    });

    textTiles.exit().remove();

  } 

  d3.contextMenu = function (menu, openCallback) {

  // create the div element that will hold the context menu
  d3.selectAll('.d3-context-menu').data([1])
    .enter()
    .append('div')
    .attr('class', 'd3-context-menu');

  // close menu
  d3.select('body').on('click.d3-context-menu', function() {
    d3.select('.d3-context-menu').style('display', 'none');
  });

  // this gets executed when a contextmenu event occurs
  return function(data, index) {
    var elm = this;

    d3.selectAll('.d3-context-menu').html('');
    d3.selectAll('.d3-context-menu').append('span').style('text-align', 'center').text('Butler Id: ' + data.id);
    var list = d3.selectAll('.d3-context-menu').append('ul');
    list.selectAll('li').data(menu).enter()
      .append('li')
      .html(function(d) {
        return (typeof d.title === 'string') ? d.title : d.title(data);
      })
      .on('click', function(d, i) {
        d.action(elm, data, index);
        d3.select('.d3-context-menu').style('display', 'none');
      });

    // the openCallback allows an action to fire before the menu is displayed
    // an example usage would be closing a tooltip
    if (openCallback) {
      if (openCallback(data, index) === false) {
        return;
      }
    }

    // display context menu
    d3.select('.d3-context-menu')
      .style('left', (d3.event.pageX - 2) + 'px')
      .style('top', (d3.event.pageY - 2) + 'px')
      .style('display', 'block');

    d3.event.preventDefault();
    d3.event.stopPropagation();
  };
};

  function HSVtoRGB_HEX(h, s, v) {
      var r, g, b, i, f, p, q, t;
      if (arguments.length === 1) {
          s = h.s, v = h.v, h = h.h;
      }
      i = Math.floor(h * 6);
      f = h * 6 - i;
      p = v * (1 - s);
      q = v * (1 - f * s);
      t = v * (1 - (1 - f) * s);
      switch (i % 6) {
          case 0: r = v, g = t, b = p; break;
          case 1: r = q, g = v, b = p; break;
          case 2: r = p, g = v, b = t; break;
          case 3: r = p, g = q, b = v; break;
          case 4: r = t, g = p, b = v; break;
          case 5: r = v, g = p, b = q; break;
      }
      var red = (Math.round(r * 255)).toString(16);
      if (red.length != 2) {
          red = '0' + red
      }
      var green = (Math.round(g * 255)).toString(16);
      if (green.length != 2) {
          green = '0' + green
      }
      var blue = (Math.round(b * 255)).toString(16);
      if (blue.length != 2) {
          blue = '0' + blue
      }
      var hex_code = '#' + red + green + blue;
      return hex_code;
  };

  function get_popularity_colour_code(score) {
    if (score == 0.0){
        score = 0.0001; // Hue cannot be zero
    };
    var saturation = 1;
    var value = 1;
    var hue = score*280.0/360.0;
    var c_code = HSVtoRGB_HEX(hue,saturation,value);
    return c_code
  };

  function render_map_area() {

    var tiles = svg
      .selectAll(".tile")
      .data(mapdata, function (d) {
        return d.coordinate;
      });
    var tilerects = tiles.enter().append("rect").attr("class", "tile");
    var tiletips = tilerects.append("svg:title");

    tiles
      .attr("x", function (d) {
        return g_width - (d.coord[0] + 1) * (tile_width + tile_xspace);
      })
      .attr("y", function (d) {
        return tile_yspace + d.coord[1] * (tile_height + tile_yspace);
      })
      .attr("width", tile_width)
      .attr("height", tile_height)
      .transition()
      .duration(transition_duration)
      .attr("fill", function (d) {
        switch (d.res_status) {
          case "turn":
            return "#8c8c8c";
          case "moving":
            return "yellow";
          case "idle":
            if(d.store_status === 0 || heat_map !== "location"){
              return "#abd444";
            }else{
              if(heat_map === "location"){
                var c_code = get_popularity_colour_code(d.location_score);
                return c_code
              }
            }
          case "safety":
              return "#00ffff";
          default:
            if (d.store_status == 1) {
              if(heat_map !== "location"){
                return "#cfcfcf";
              }else{
                var c_code = get_popularity_colour_code(d.location_score);
                return c_code
              }
            }
            else {
              return "#efefef";
            }
        }
      })
      .attr("stroke", "black")
      .attr("stroke-width", tile_stroke);
    tiletips.text(function (d) {
      return d.coordinate + " : " +
        JSON.stringify(d.neighbours) + ", " +
        JSON.stringify(d.size_info) + ", " +
        JSON.stringify(d.zone);
    });


    tiles.exit().remove();

      var tilebacks = svg
              .selectAll(".tilebacks")
              .data(mapdata, function (d) {
                  return d.coordinate;
              });
      tilebacks.enter().append("path").attr("class", "tilebacks");
      tilebacks
          .transition()
          .attr('d', function(d) {
              var x1 = g_width - (d.coord[0] + 1) * (tile_width + tile_xspace);
              var y1 = tile_yspace + d.coord[1] * (tile_height + tile_yspace);
              var x2 = x1 + tile_width;
              var y2 = y1 + tile_height;
              var path = "";
              if (d.is_pick_position) {
                  var center_x = x1 + tile_width/2;
                  var center_y = y1 + tile_height/2;
                  path +=
                      d3_move(center_x, y1) +
                      d3_line(x2, center_y) +
                      d3_line(center_x, y2) +
                      d3_line(x1, center_y) +
                      d3_line(center_x, y1)
                      ;
              }
              if (d.is_charger_location) {
                  var left_mid_x = x1 + tile_width/3;
                  var right_mid_x = x1 + tile_width*2/3;
                  var center_y = y1 + tile_height/2;
                  path +=
                      d3_move(x1 + tile_width/6, y2) +
                      d3_line(right_mid_x, center_y) +
                      d3_line(left_mid_x, center_y) +
                      d3_line(x2 - tile_width/6, y1)
                      ;
              }
              if (d.blocked) {
                  path += d3_move(x1, y1) + d3_line(x2, y2) + d3_move(x1, y2) + d3_line(x2, y1);
              }
              return path;
          })
          .attr('fill', 'none')
          .attr('stroke', function(d) {
              if (d.blocked) {
                  return "red";
              }
              if (d.is_pick_position) {
                  return "blue";
              }
              if (d.is_charger_location) {
                  return "magenta"
              }
              return "white";
          })
          .attr('stroke-width', 2);
      tilebacks.exit().remove();


    var tilesText = svg
      .selectAll(".tileText")
      .data(mapdata, function (d) {
        return d.coordinate;
      });
    tilesText.enter().append("text").attr("class", "tileText");
    tilesText
      .attr("x", function (d) {
        return g_width - (d.coord[0] + 1) * (tile_height + tile_xspace);
      })
      .attr("y", function (d) {
        return tile_yspace + d.coord[1] * (tile_width + tile_yspace) - (tile_stroke * 2);
      })
      .text(function (d) {
        return d.barcode;
      });
    tilesText.exit().remove();

    var oneJson={
        "event": "user_command",
          "command": "send_init",
          "butler_id": 10
          };



    var bots = svg
      .selectAll(".bot")
      .data(botdata, function (d) {
        return d.id;
      });
    bots.enter().append("rect").attr("class", "bot");
    bots
      .transition()
      .duration(transition_duration)
      .attr("x", function (d) {
        var rd;
        if (d.direction === 0 || d.direction === 2) {
          rd = 5 * tile_width / 12;
        } else {
          rd = tile_width / 4;
        }
        return g_width - (d.coord[0] + 1) * (tile_width + tile_xspace) + rd;
      })
      .attr("y", function (d) {
        var rd;
        if (d.direction === 0 || d.direction === 2) {
          rd = tile_width / 4;
        } else {
          rd = 5 * tile_width / 12;
        }
        return tile_yspace + d.coord[1] * (tile_height + tile_yspace) + rd;
      })
      .attr("width", function (d) {
        if (d.direction === 0 || d.direction === 2) {
          return tile_width / 6;
        } else {
          return tile_width / 2;
        }
      })
      .attr("height", function (d) {
        if (d.direction === 0 || d.direction === 2) {
          return tile_height / 2;
        } else {
          return tile_height / 6;
        }
      })
      .attr("fill", "#de3c85");

    bots.on('mouseover', function(d) {
      var botbox = d3
            .selectAll('div.binfo')
            .filter(function(d1) {
              return d1 == d;
            });
      $(botbox[0]).addClass("bot_selected");
    });
    bots.on('mouseout', function(d) {
      var botbox = d3
            .selectAll('div.binfo')
            .filter(function(d1) {
              return d1 == d;
            });
      $(botbox[0]).removeClass("bot_selected");
    });

    bots.on('contextmenu', d3.contextMenu(menu)); // attach menu to element

    bots.exit().remove();

    var botheads = svg
      .selectAll(".bothead")
      .data(botdata, function (d) {
        return d.id;
      });
    botheads.enter().append("rect").attr("class", "bothead");
    botheads
      .transition()
      .duration(transition_duration)
      .attr("x", function (d) {
        var rd;
        switch (d.direction) {
        case 0:
        case 2:
          rd = 5 * tile_width / 12;
          break;
        case 1:
          rd = 23 * tile_width / 36;
          break;
        case 3:
          rd = tile_width / 4;
          break;
        }
        return g_width - (d.coord[0] + 1) * (tile_width + tile_xspace) + rd;
      })
      .attr("y", function (d) {
        var rd;
        switch (d.direction) {
        case 0:
          rd = tile_width / 4;
          break;
        case 2:
          rd = 23 * tile_width / 36;
          break;
        case 1:
        case 3:
          rd = 5 * tile_width / 12;
          break;
        }
        return tile_yspace + d.coord[1] * (tile_height + tile_yspace) + rd;
      })
      .attr("width", function (d) {
        if (d.direction === 0 || d.direction === 2) {
          return tile_width / 6;
        } else {
          return tile_width / 9;
        }
      })
      .attr("height", function (d) {
        if (d.direction === 0 || d.direction === 2) {
          return tile_height / 9;
        } else {
          return tile_height / 6;
        }
      })
      .attr("fill", "black");
    botheads.exit().remove();

    var racks = svg
      .selectAll(".rack")
      .data(rackdata);
    racks.enter().append("rect").attr("class", "rack");
    racks
      .transition()
      .duration(transition_duration)
      .attr("x", function (d) {
        return g_width - (d.coord[0] + 1) * (tile_width + tile_xspace) + tile_width / 8;
      })
      .attr("y", function (d) {
        return tile_yspace + d.coord[1] * (tile_height + tile_yspace) + tile_height / 8;
      })
      .attr("width", 3 * tile_width / 4)
      .attr("height", 3 * tile_height / 4)
      .attr("fill", "none")
      .attr("stroke", function (d) {
        if (heat_map === 'racks' && d.popularity) { // Racks heat map enabled
            var c_code = get_popularity_colour_code(d.popularity);
            return c_code
        } else {
            if(heat_map === 'location'){
              return "#808080";
            }
            if (d.lifted_butler_id !== null) {
              return "#964B00";
            } else {
              return "#FFA500";
            }
        }
      })
      .attr("stroke-width", (tile_height + tile_width) / 16);
    racks.exit().remove();

    var rackheads = svg
      .selectAll(".rackhead")
      .data(rackdata);
    rackheads.enter().append("rect").attr("class", "rackhead");
    rackheads
      .transition()
      .duration(transition_duration)
      .attr("x", function (d) {
        var rd;
        switch (d.direction) {
        case 0:
        case 2:
          rd = 7 * tile_width / 16;
          break;
        case 1:
          rd = 13 * tile_width / 16;
          break;
        case 3:
          rd = 1 * tile_width / 16;
          break;
        }
        return g_width - (d.coord[0] + 1) * (tile_width + tile_xspace) + rd;
      })
      .attr("y", function (d) {
        var rd;
        switch (d.direction) {
        case 0:
          rd = 1 * tile_height / 16;
          break;
        case 2:
          rd = 13 * tile_height / 16;
          break;
        case 1:
        case 3:
          rd = 7 * tile_height / 16;
          break;
        }
        return tile_yspace + d.coord[1] * (tile_height + tile_yspace) + rd;
      })
      .attr("width", tile_width / 8)
      .attr("height", tile_height / 8)
      .attr("fill", "black");
    rackheads.exit().remove();
  }
});

/* Move to different file */

function d3_move(x, y) {
    return " M" + x + "," + y;
}

function d3_line(x, y) {
    return " L" + x + "," + y;
}


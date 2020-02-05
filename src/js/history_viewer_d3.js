/*jslint browser: true, indent: 2, vars: true*/
/*global define*/

define(["jquery", "d3", "underscore", "jquery-ui"], function ($, d3, _){
    "use strict";
        var username = "admin";
        var password = "gorapj";
        var installation_id;
        var influxdb_name = 'GreyOrange';
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
        var transition_duration = 300;
        var rack_flag = 1;
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
        var num_rows, num_cols;
        var rack_indexes = {};
        var sysinfo = g_sysinfo[0];
        var svg_out;
        var svg;
        var racks_svg;
        var playing = true;
        var websocket;
        var count=1;
        var fetch_map_from_influxdb = true;
        var influxdb_map_data, influxdb_pps_data, influxdb_chargers_data;
        var heat_map = true;
        var keyframes_list = [];
        var keyframes_available = false;
        var current_keyframe_index = 0;
        var next_keyframe_index = 1;
        var max_threshold = 500;
        var record_no = 0;
        var fetching_data = false;
        var start_timestamp, end_timestamp;
        var stop_fetching = false;
        var map_changed_list = [];
        var map_changed_current_index = 0;
        var host = "http://" + $("#host_ip").val() + ":8086";// url to influxdb
        var playing = true;
        var offset = 0;
        var a_color = "#8c8c8c";
        var b_color = "yellow";
        var c_color = "#efefef";
        var d_color = "#00ffff";
        var series = "butler_movement";
        var butlers_hashmap = {};//hash_map
        var racks_hashmap = {};
        var butlers_array = [];// to be used by render
        var racks_array = [];
        var delta = 1;// # of rows to be fetched form influxdb
        var result_set = [];
        // var result_set_previous = [];
        var time_of_first_row = "0";
        var time_of_last_row = "0";
        var from_time, to_time, startup_time;
        var time_unit = "Seconds";
        var slider_step_size = 0;
        var previous_window = 500;//20 minutes
        var start_index = 0;
        var end_index;
        var slider, nav_slider;
        var timeout_id;
        var play_from;
        // var current_pointer = 0;
        var seek_time = 0;
        var startup_times = [];
        var change_map = false;
        var butler_traced = {};

        $("#loader").hide();

        function difference_between_two_times(time_of_first_row, time_of_last_row){
                var d1 = new Date(time_of_first_row);
                var d2 = new Date(time_of_last_row);
                var diff = d2-d1;// In milli seconds
                diff = Math.floor(diff/1000);// In seconds
                return diff;    //the returned time is in seconds
        }

        function set_slider_step_size(full_time){
                time_unit = "Seconds";
                // slider_step_size = Math.floor((full_time)/100);
                // //console.log(slider_step_size);
                $('#time_range').html("Time range: "+ new Date(time_of_first_row)+" to "+ new Date(time_of_last_row));
        }

        function initiate_slider(full_time){
                slider = $("#slider_range").slider({
                        range: false,
                        min: 0,
                        max: full_time,// full_time is in seconds
                        values: 0,
                        step: 1,//each step is of 20 secconds
                        animate: true,
                        slide: function(event, ui){
                          clearTimeout(timeout_id);
                        },
                        stop: function( event, ui ) {
                          clearTimeout(timeout_id);
                          slider_event(ui.value);
                          // slider.slider("value", ui.value);
                        }
                });
        }


        function reload_map(start_time){
                stop_fetching = false;
                botdata = [];
                //console.log("slider event", time);
                butlers_array = [];
                butlers_hashmap = {};
                racks_array = [];
                racks_hashmap = {}
                rackdata = [];
                result_set = [];
                influxdb_map_data = [];
                influxdb_chargers_data = [];
                influxdb_pps_data = [];
                start_index = 0;
                offset = 0;
                end_index = 0;
                record_no = 0;
                var query3 = false;
                var timediff = 0;
                time_of_first_row = influxdb_time_format(new Date(start_time.valueOf() + start_time.getTimezoneOffset()*60000));
                timediff = difference_between_two_times(new Date(startup_time), new Date(time_of_first_row));
                slider.slider("value", timediff);
                d3.select("#mapbox").html("");
                fetch_d3map_data(time_of_first_row);
        }

        function slider_event(time){
                var start_time = new Date(new Date(from_time).getTime() + parseInt(time)*1000);
                reload_map(start_time);
        }//fn

        $("#add").click(function(){
                var fastfwdspeed = parseInt($("#fastfwd").val());
                fastfwdspeed = fastfwdspeed + 1;
                $("#fastfwd").val(fastfwdspeed);
        });
        $("#playbackbutton").button({
                icons: {
                        primary: "ui-icon-pause"
                },
                text: false
        }).click(function () {
                var options;
                if(playing){
                        options = {
                                icons: {
                                        primary: "ui-icon-play"
                                }
                        };
                        playing=false;
                        clearTimeout(timeout_id);

                }else{
                        options = {
                                icons: {
                                        primary: "ui-icon-pause"
                                }
                        };
                        playing = true;
                        play_history();
                }
                $( this ).button( "option", options );
        });
        $("#subtract").click(function(){
                var fastfwdspeed = parseInt($("#fastfwd").val());
                if(fastfwdspeed > 1)
                        fastfwdspeed = fastfwdspeed - 1;
                $("#fastfwd").val(fastfwdspeed);
        });
         /*On cliking the button, startup times to be fetched from server*/
        $("#load_startup_list").click(function(){
                $("#startup_list").empty();
                var startup_dd = document.getElementById("startup_list");
                var xmlHttp = new XMLHttpRequest();
                host = "http://" + $("#host_ip").val() + ":8086";
                installation_id = $("#installation_id_input").val();
                var xurl = host+"/query?q=select+*+from+butler_server_startup_log+where+installation_id='"+installation_id+"'+order+by+time+ASC&db="+influxdb_name;
                xmlHttp.open("GET", xurl, true);
                xmlHttp.send();
                xmlHttp.onreadystatechange = function(){
                        if(xmlHttp.readyState == 4 && xmlHttp.status == 200){
                                var responseText = JSON.parse(xmlHttp.responseText);
                                var responseValue = responseText["results"][0];
                                if(responseValue.hasOwnProperty("series")){
                                        responseValue = responseValue["series"][0];
                                        if(responseValue.hasOwnProperty("values")){
                                                for(var i=0; i < responseValue.values.length; i++){
                                                        var opt = document.createElement('option');
                                                        opt.value = i;
                                                        opt.innerHTML = new Date(responseValue.values[i][0]);
                                                        startup_dd.appendChild(opt);
                                                        startup_times[i] = responseValue.values[i][0];
                                                }
                                        }
                                }
                        }
                }
                $("#start_simulation").attr("disabled", false);
        });

        $("#start_simulation").click(function(){
                var time_index; //variable that stores value of selected time's index
                var query1, query2, query3 = false, query4;
                time_index = parseInt($("#startup_list").val());
                var ft = new Date(startup_times[time_index]);
                startup_time = influxdb_time_format(new Date(ft.valueOf() + ft.getTimezoneOffset()*60000));
                var tt = startup_times.hasOwnProperty(time_index + 1) ? new Date(startup_times[time_index + 1]) : new Date(new Date(startup_time).getTime() + 60 * 60 * 24 * 1000);
                to_time = influxdb_time_format(new Date(tt.valueOf() + tt.getTimezoneOffset()*60000));
                // console.log(from_time, to_time);
                swal({
                        title: "Select Start Date!",
                        text: "Select Start Date:",
                        type: "input",
                        inputValue: new Date(startup_time),
                        showCancelButton: true,
                        closeOnConfirm: false,
                        animation: "slide-from-top",
                        inputPlaceholder: "Write something"
                }, function(inputValue1){
                        if (inputValue1 === false)
                                return false;
                        if (inputValue1 === "") {
                                swal.showInputError("You need to write something!");
                                return false;
                        }
                        time_of_first_row = inputValue1;
                        swal({
                                title: "Select End Date!",
                                text: "Sart Date:"+ new Date(time_of_first_row) + "\n End Date: ",
                                type: "input",
                                inputValue: new Date(to_time),
                                showCancelButton: true,
                                closeOnConfirm: true,
                                animation: "slide-from-top",
                                inputPlaceholder: "Write something"
                        }, function(inputValue2){
                                if (inputValue2 === false){
                                          return false;
                                }
                                if (inputValue2 === "") {
                                          swal.showInputError("You need to write something!");
                                          return false
                                }
                                time_of_last_row = inputValue2;
                                var full_time_in_seconds = difference_between_two_times(new Date(time_of_first_row), new Date(time_of_last_row));
                                set_slider_step_size(full_time_in_seconds);
                                initiate_slider(full_time_in_seconds);

                                fetch_d3map_data(time_of_first_row)
                                // console.log(time_of_first_row, time_of_last_row);

                        });

                });
        });

        function fetch_d3map_data(draw_from_time){
                var temp = new Date(time_of_last_row);
                var tolr = influxdb_time_format(new Date(temp.valueOf() + temp.getTimezoneOffset()*60000));
                var query = "select+time,event_name,value+from+d3map+where+installation_id='"+
                                installation_id+"'+and+time+>=+'"+startup_time+"'+and+time<='"+tolr
                                +"'+order+by+time+ASC+limit+1&db="+influxdb_name;
                var d3_times_xmlHttp = new XMLHttpRequest();
                var d3_times_url = host+"/query?q="+query;
                d3_times_xmlHttp.open("GET", d3_times_url, true);
                d3_times_xmlHttp.send();
                map_changed_list = [];
                d3_times_xmlHttp.onreadystatechange = function(){
                        //fetch the d3 map here
                        if(d3_times_xmlHttp.readyState == 4 && d3_times_xmlHttp.status == 200){
                                var d3_times_Text = JSON.parse(d3_times_xmlHttp.responseText);
                                var d3_times_Values = d3_times_Text["results"][0];
                                var index = 0;
                                if(d3_times_Values.hasOwnProperty("series"))
                                        d3_times_Values = d3_times_Values["series"][0];
                                if(d3_times_Values.hasOwnProperty("values")){
                                        for(var i=0; i< d3_times_Values.values.length; i++){
                                                if(d3_times_Values.values[i][1] == "map_changed"){
                                                        map_changed_list[i] = d3_times_Values.values[i][0];
                                                }
                                                if(new Date(draw_from_time) >= new Date(map_changed_list[i]))
                                                        index = i;
                                        }
                                        from_time = d3_times_Values.values[index][0];
                                        time_of_first_row = draw_from_time;
                                        start_map_drawing();
                                }
                        }
                }
        }

        function start_map_drawing(){
                var query1 = "select+*+from+d3map+where+installation_id='"+installation_id+"'+and+time+=+'"+from_time+"'&db="+influxdb_name;
                var first_xmlHttp = new XMLHttpRequest();
                var first_url = host+"/query?q="+query1;
                first_xmlHttp.open("GET", first_url, true);
                first_xmlHttp.send();
                first_xmlHttp.onreadystatechange = function(){
                        if(first_xmlHttp.readyState == 4 && first_xmlHttp.status == 200){
                                var responseText = JSON.parse(first_xmlHttp.responseText);
                                var responseValue = responseText["results"][0];
                                if(responseValue.hasOwnProperty("series"))
                                        responseValue = responseValue["series"][0];
                                if(responseValue.hasOwnProperty('values')){
                                        var indexes = {};
                                        responseValue.columns.forEach(function(item, index){
                                              indexes[item] = index;
                                        });
                                        influxdb_chargers_data = responseValue.values[0][indexes['chargers']];
                                        influxdb_map_data = responseValue.values[0][indexes['map']];
                                        influxdb_pps_data = responseValue.values[0][indexes['pps']];
                                        fetch_map_from_influxdb = true;
                                        refresh_map();
                                        render_static_map();
                                        get_butler_step_key_frames();
                                }else{
                                        swal("Map Not Found in influxdb", "Please load map", "error");
                                        return 0;
                                }
                        }
                }
        }

        function influxdb_time_format(ts){
                var DD = ts.getDate();
                DD = DD<10? '0'+DD : DD;
                var MM = ts.getMonth() + 1;
                MM = MM<10? '0'+MM : MM;
                var YYYY = ts.getFullYear();
                var hh = ts.getHours();
                hh = hh<10? '0'+hh : hh;
                var mm = ts.getMinutes();
                mm = mm<10? '0'+mm : mm;
                var ss = ts.getSeconds();
                ss = ss<10? '0'+ss : ss;
                return YYYY+"-"+MM+"-"+DD+"T"+hh+":"+mm+":"+ss+".000Z";
        }

        function zoom() {
                console.log(d3.event.translate, d3.event.scale);
                svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }
        function refresh_map() {
                var keysData = JSON.parse(influxdb_map_data);
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
                num_rows = maxy - miny;
                num_cols = maxx - minx;
                var area = num_rows * num_cols * (tile_width + tile_xspace) * (tile_height + tile_yspace);
                var area_of_map = g_width * g_height;
                var scale = area_of_map/area;
                console.log(area_of_map, area);
                if(scale < 0.05)
                        scale = 0.05;
                else if(scale > 2.5)
                        scale = 2.5;
                console.log(scale);
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
                        .call(d3.behavior.zoom().scaleExtent([0.05, 2.5]).on("zoom", zoom))
                        .attr("transform", "translate(" + 0 + ", " + 0 + ")")
                        .append("g");
                svg.append("rect")
                        .attr("class", "overlay")
                        .attr("width", g_width)
                        .attr("height", g_height);
                refresh_pps();
        }

        function refresh_pps() {
                var ppsData = JSON.parse(influxdb_pps_data);
                ppsData.forEach(function (data) {
                        mapdata.forEach(function (element) {
                                if (element.barcode === data.pick_position) {
                                  element.is_pick_position = true;
                                }
                        });
                        g_mapdata[1] = $.extend(true, [], mapdata);
                });
                refresh_chargers();
        }

        function refresh_chargers() {
                var chargers = JSON.parse(influxdb_chargers_data);
                var x, y;
                chargers.forEach(function (data) {
                        mapdata.forEach(function (element) {
                                if (element.barcode === data.charger_location) {
                                        element.is_charger_location = true;
                                }
                        });
                        g_mapdata[1] = $.extend(true, [], mapdata);
                });
                // render();
        }

        function render_static_map(){
                // console.log("Hello World");
                //alert("render map area");
                var tiles = svg
                        .selectAll(".tile")
                        .data(mapdata, function (d) {
                                return d.coordinate;
                        });
                var tilerects = tiles.enter().append("rect").attr("class", "tile");
                var tiletips = tilerects.append("svg:title");

                tiles
                        .attr("id", function(d){
                            return "barcode_"+d.barcode.replace(/\./g,'_');
                        })
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
                              return a_color;
                            case "moving":
                              return b_color;
                            case "idle":
                              return c_color;
                            case "safety":
                              return d_color;
                            default:
                              if (d.store_status == 1) {
                                return "#cfcfcf";//dark grey
                              }
                              else {
                                return "#efefef";//light grey
                              }
                          }
                        })
                        .attr("stroke", "black")
                        .attr("stroke-width", tile_stroke);
                tiletips.text(function (d) {
                        return d.coordinate + " : " + JSON.stringify(d.neighbours);
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
                                        d3_line(x2 - tile_width/6, y1);
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
        }

        function get_butler_step_key_frames(){
                botdata = [];
                butlers_array = [];
                butlers_hashmap = {};
                racks_array = [];
                racks_hashmap = {}
                rackdata = [];
                var tofr = new Date(time_of_first_row);
                var tolr = new Date(time_of_last_row);
                var end_time_offset = (time_of_first_row === time_of_last_row) ? 1 : 0;
                tolr.setMinutes(tolr.getMinutes() + end_time_offset);
                start_timestamp = influxdb_time_format(new Date(tofr.valueOf() + tofr.getTimezoneOffset()*60000));
                end_timestamp = influxdb_time_format(new Date(tolr.valueOf() + tolr.getTimezoneOffset()*60000));

                //Fetch Keyframes
                // console.log(from_time, start_timestamp);
                var query = "select+time,value+from+butler_step_key_frames+where+installation_id='"+installation_id+
                            "'+and+time+>=+'"+from_time+"'+and+time<='"+end_timestamp+"'+order+by+time+ASC&db="+influxdb_name;
                slider.slider("value", difference_between_two_times(start_timestamp, from_time));
                //console.log(query);
                var xurl = host+"/query?q="+query;
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open("GET", xurl, true);
                xmlHttp.send();
                xmlHttp.onreadystatechange = function(){
                        host = "http://" + $("#host_ip").val() + ":8086";
                        if(xmlHttp.readyState == 4 && xmlHttp.status == 200){
                                var response = JSON.parse(xmlHttp.responseText);
                                var resp = response["results"][0];
                                if(resp.hasOwnProperty("series")){
                                        resp = resp["series"][0];
                                        if(resp.hasOwnProperty("values")){
                                                for(var i=0; i<resp.values.length; i++){
                                                        keyframes_list.push(resp.values[i][0]);
                                                }
                                        }
                                }
                                //navigate thorough keyframes and find the keyframe before start_timestamp
                                var s = new Date(start_timestamp);
                                var index = 0;
                                // console.log(start_timestamp, from_time, keyframes_list);
                                for(var i=1; i<keyframes_list.length; i++){
                                        if(new Date(keyframes_list[i]) <= s)
                                                index = i;
                                        else
                                                break;
                                }
                                if(index != -1){
                                        play_from = keyframes_list[i];
                                        render_racks_and_bots();
                                        // console.log(i, start_timestamp);
                                        // fetch_butler_step_logs_data();
                                }
                                else
                                        alert("Something went wrong...");
                        }
                }
        }
        function render_racks_and_bots(){
                // console.log("Rendering racks and bots")
                //Fetch keyframes and use first data for map and rack
                var xmlHttp = new XMLHttpRequest();
                var xurl = host+"/query?q=select+*+from+butler_step_key_frames+where+installation_id='"+installation_id+
                "'+and+time='"+ play_from +"'+order+by+time+ASC+limit+1&db="+influxdb_name;
                xmlHttp.open("GET", xurl, true);
                xmlHttp.send();
                xmlHttp.onreadystatechange = function(){
                        if(xmlHttp.readyState == 4 && xmlHttp.status == 200){
                                var rT = JSON.parse(xmlHttp.responseText);
                                var rV = rT["results"][0];
                                if(rV.hasOwnProperty("series")){
                                        rV = rV["series"][0];
                                }
                                if(rV.hasOwnProperty("values") && rV.values.hasOwnProperty(0)){
                                        racks_array = JSON.parse(rV.values[0][4]);
                                        rack_flag = 1;
                                        for(var i=0; i< racks_array.length; i++){
                                                racks_hashmap[racks_array[i]["id"]] = racks_array[i];
                                                var coord = racks_array[i]["position"].split(".");
                                                racks_hashmap[racks_array[i]["id"]]["coord"] = [parseInt(coord[1]), parseInt(coord[0])];
                                                racks_array[i]["coord"] = [parseInt(coord[1]), parseInt(coord[0])];
                                                racks_hashmap[racks_array[i]["id"]]["array_index"] = i;
                                        }
                                        rackdata = racks_array;
                                        butlers_array = JSON.parse(rV.values[0][1]);
                                        for(var i=0; i < butlers_array.length; i++){
                                                var coord = butlers_array[i]["position"].split(".");
                                                butlers_array[i]["coord"] = [parseInt(coord[1]), parseInt(coord[0])];
                                                butlers_hashmap[butlers_array[i]["id"]] = butlers_array[i];
                                                butlers_hashmap[butlers_array[i]["id"]]["array_index"] = i;
                                        }
                                }
                                rackdata = racks_array;
                                botdata = butlers_array;
                                render_racks();
                                render_bots();
                                render_rightbar();
                                fetch_butler_step_logs_data(max_threshold);
                                // console.log(result_set);
                                // play_hi  story();
                        }
                }
        }


        function fetch_butler_step_logs_data(num_of_records, delay, first_time){
                fetching_data = true;
                var ymlHttp = new XMLHttpRequest();
                //fetch data from start to end  upto threshold


                var yurl = host+"/query?q=select+*+from+butler_step_logs+where+installation_id='"+installation_id+
                        "'+and+time>='"+ play_from+"'+and+time<='"+end_timestamp+"'+order+by+time+ASC+limit+"+num_of_records+"+offset+"+record_no+"&db="+influxdb_name;
                ymlHttp.open("GET", yurl, true);
                $("#loader").show();
                ymlHttp.send();
                var flag = false;
                var final_result;
                ymlHttp.onreadystatechange = function(){
                        if(ymlHttp.readyState == 4 && ymlHttp.status == 200){
                                var responseText = JSON.parse(ymlHttp.responseText);
                                //console.log(responseText);
                                record_no += num_of_records;
                                var responseValue = responseText["results"][0];
                                if(responseValue.hasOwnProperty("series"))
                                        responseValue=responseValue["series"][0];
                                    // console.log(responseValue);
                                $('#start_simulation').text('Simulation History');
                                $("#start_simulation").attr("disabled", false);
                                if(responseValue.hasOwnProperty("values")){
                                        fetching_data = false;
                                        // console.log(result_set, result_set.length);
                                        if(result_set.length)
                                                $.merge(result_set, responseValue.values);
                                        else
                                                result_set = responseValue.values;
                                        end_index = result_set.length - 1;
                                        $("#loader").hide();
                                        $("#available_data").html(end_index);
                                        // console.log(responseValue.columns, delay);
                                        if(delay === undefined)
                                                delay = 0;
                                        timeout_id = setTimeout(function(){play_history()}, delay);
                                }
                        }
                }
        }


        function find_delta(){
                //delta: is the number of rows that can be fetched simultaneously from influxdb
                //this is dynamic, its value can be different for each call to this function
                //this function returns 0: if result_set.length == 0
                                     //  or, result_set has already been traversed completely
                var rows = 0;
                while(1){
                        if((rows+offset)<=result_set.length-1){
                                var ts1 = new Date(result_set[rows+offset][0]);
                                var butler_id = result_set[rows+offset][1];
                                rows = rows + 1;
                                if(rows > result_set.length-1){
                                        break;
                                }else{
                                        if(!result_set.hasOwnProperty(rows+offset)){
                                                break;
                                        }
                                        var ts2 = new Date(result_set[rows + offset][0])
                                        if(ts2 != ts1){
                                                break;
                                        }
                                }
                        }//if
                }
                return rows;
        }//find_delta

        function play_history(){
                if(change_map){
                        reload_map(map_changed_list[0]);
                        map_changed_list.splice(0, 1);
                        change_map = false;
                }
                if(result_set.length){
                        var delay = 0;
                        // console.log("682", delay);
                        var ts1 = new Date(result_set[0][0]);
                        delta = find_delta();
                        if(result_set.hasOwnProperty(delta)){
                                var ts2 = new Date(result_set[delta][0]);
                                delay = ts2 - ts1;
                                if(map_changed_list.length != 0){
                                        if(new Date(map_changed_list[0]) <= ts2){
                                                change_map = true;
                                        }
                                }
                        }
                        if(delay > 10000){
                            delay = 10000;
                        }
                        var timediff = difference_between_two_times(new Date(startup_time), new Date(ts1));
                        slider.slider("value", timediff);
                        // console.log(delay);
                        for(var index = 0; index < delta; index++){
                                if(result_set[index][1] !== null && result_set[index][1] !== "" && result_set[index][1] !== undefined){
                                        var yyy = parseInt(result_set[index][1].split(".")[0]);
                                        var xxx = parseInt(result_set[index][1].split(".")[1]);
                                        var array_index = botdata.length;
                                        if(butlers_hashmap.hasOwnProperty(result_set[index][2])){
                                                array_index = butlers_hashmap[result_set[index][2]]["array_index"];
                                        }
                                        butlers_hashmap[result_set[index][2]] =
                                                {
                                                        id: parseInt(result_set[index][2]),
                                                        direction: parseInt(result_set[index][3]),
                                                        position: result_set[index][1],
                                                        status: "idle",
                                                        navstatus: "info",
                                                        coord: [xxx, yyy],
                                                        paused: true,
                                                        taskkey: "713d9baf-e420-43ae-8189-5ffcd198685f",
                                                        tasktype: "movetask",
                                                        deltas: [0,0,0],
                                                        voltage: 0,
                                                        error_desc: "no_error",
                                                        timestamp: result_set[index][0],
                                                        array_index: array_index
                                                };
                                        if(array_index === botdata.length){
                                          butlers_array.push(butlers_hashmap[result_set[index][2]]);
                                        }else{
                                          butlers_array[butlers_hashmap[result_set[index][2]]["array_index"]] = butlers_hashmap[result_set[index][2]];
                                        }
                                        var bsvg = svg.select("#bot_"+result_set[index][2]);
                                        bsvg.transition()
                                                .duration(transition_duration)
                                                .attr("x", function (d) {
                                                        ////console.log(".bot");
                                                        var rd;
                                                        if (parseInt(result_set[index][3]) === 0 || parseInt(result_set[index][3]) === 2) {
                                                          rd = 5 * tile_width / 12;
                                                        } else {
                                                          rd = tile_width / 4;
                                                        }
                                                        return g_width - (xxx + 1) * (tile_width + tile_xspace) + rd;
                                                })
                                                .attr("y", function (d) {
                                                        var rd;
                                                        if (parseInt(result_set[index][3]) === 0 || parseInt(result_set[index][3]) === 2) {
                                                          rd = tile_width / 4;
                                                        } else {
                                                          rd = 5 * tile_width / 12;
                                                        }
                                                        return tile_yspace + yyy * (tile_height + tile_yspace) + rd;
                                                })
                                                .attr("width", function (d) {
                                                        if (parseInt(result_set[index][3]) === 0 || parseInt(result_set[index][3]) === 2) {
                                                          return tile_width / 6;
                                                        } else {
                                                          return tile_width / 2;
                                                        }
                                                })
                                                .attr("height", function (d) {
                                                        if (parseInt(result_set[index][3]) === 0 || parseInt(result_set[index][3]) === 2) {
                                                          return tile_height / 2;
                                                        } else {
                                                          return tile_height / 6;
                                                        }
                                                });
                                        var botheads = svg.selectAll("#bothead_"+result_set[index][2])
                                        botheads
                                                .transition()
                                                .duration(transition_duration)
                                                .attr("x", function (d) {
                                                        var rd;
                                                        switch (parseInt(result_set[index][3])) {
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
                                                        return g_width - (xxx + 1) * (tile_width + tile_xspace) + rd;
                                                })
                                                .attr("y", function (d) {
                                                        var rd;
                                                        switch (parseInt(result_set[index][3])) {
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
                                                        return tile_yspace + yyy * (tile_height + tile_yspace) + rd;
                                                })
                                                .attr("width", function (d) {
                                                        if (parseInt(result_set[index][3]) === 0 || parseInt(result_set[index][3]) === 2) {
                                                                return tile_width / 6;
                                                        } else {
                                                                return tile_width / 9;
                                                        }
                                                })
                                                .attr("height", function (d) {
                                                        if (parseInt(result_set[index][3]) === 0 || parseInt(result_set[index][3]) === 2) {
                                                                return tile_height / 9;
                                                        } else {
                                                                return tile_height / 6;
                                                        }
                                                })

                                        if(butler_traced[result_set[index][2]]){
                                        var msvg = svg.select("#barcode_"+result_set[index][1].replace(/\./g,'_'));
                                                msvg.transition()
                                                    .duration(transition_duration)
                                                    .attr("fill", function (d)
                                                            {
                                                                    return get_popularity_colour_code(parseInt(result_set[index][2]));
                                                            });
                                        }
                                        if(result_set[index][9] === "up"){
                                                if(!racks_hashmap.hasOwnProperty(result_set[index][11])){
                                                        racks_hashmap[result_set[index][11]] = {
                                                                coord: [xxx, yyy],
                                                                direction: parseInt(result_set[index][10]),
                                                                id: result_set[index][11],
                                                                is_stored: false,
                                                                last_store_position: result_set[index][1],
                                                                lifted_butler_id: result_set[index][2],
                                                                position: result_set[index][1],
                                                                racktype: "11",
                                                                reserved_store_position: "undefined",
                                                                upcoming_pps_list: [],
                                                                rack_score: result_set[index][12],
                                                                array_index: racks_array.length
                                                        };
                                                        racks_array.push(racks_hashmap[result_set[index][11]]);
                                                }else{
                                                        racks_hashmap[result_set[index][11]]["coord"] = [xxx, yyy];
                                                        racks_hashmap[result_set[index][11]]["direction"] = parseInt(result_set[index][10]);
                                                        racks_hashmap[result_set[index][11]]["lifted_butler_id"] = result_set[index][2];
                                                        if(result_set[index][11]["position"])
                                                                racks_hashmap[result_set[index][11]]["position"] = result_set[index][1];
                                                        racks_array[racks_hashmap[result_set[index][11]]["array_index"]] = racks_hashmap[result_set[index][11]];
                                                }
                                                var rsvg = svg.select("#rack_"+result_set[index][11]);
                                                rsvg.transition()
                                                        .duration(transition_duration)
                                                        .attr("x", function (d) {
                                                                return g_width - (d.coord[0] + 1) * (tile_width + tile_xspace) + tile_width / 8;
                                                        })
                                                        .attr("y", function (d) {
                                                          return tile_yspace + d.coord[1] * (tile_height + tile_yspace) + tile_height / 8;
                                                        });
                                                        var rackheads = svg
                                                          .select("#rackhead_"+result_set[index][11])
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
                                        }
                                        botdata = butlers_array;
                                        rackdata = racks_array;
                                }else{
                                        racks_hashmap[result_set[index][11]]["rack_score"] = result_set[index][12];
                                }
                        }
                        result_set.splice(0, offset+delta);
                        $("#available_data").html(result_set.length);
                        // console.log("890", delay);

                        delay = delay/parseInt($("#fastfwd").val());
                        // console.log("893", parseInt($("#fastfwd").val()));
                        // console.log("892",delay);
                        if(result_set.length <= max_threshold/2)
                                fetch_butler_step_logs_data(max_threshold/2, delay);
                        else
                                timeout_id = setTimeout(function(){play_history()}, delay);
                }else{
                        console.log("Nothing to play");
                }
                //Read the next record to be played
                //Check for map change if it is before next record to be played
                //If there is a map change then fetch the new map and set new variables and re render...
                //Do the changes as per the record
                //remove the played records from the array
                //check if length of array is <= max_threshold/2
                //if yes then fetch_butler_step_logs_data()
                //if no then play_history after delay...
        }




        var menu = [
                {
                        title: 'Start Tracing',
                        action: function(elm, d, i) {
                                butler_traced[d.id] = true;
                        }
                },
                {
                        title: 'Stop Tracing',
                        action: function(elm, d, i) {
                                butler_traced[d.id] = false;
                        }
                }
        ];

        function render_racks(){
                var ind = 0;
                rack_indexes = {};
                racks_svg =  svg
                        .selectAll(".rack")
                        .data(rackdata, function (r) {
                          rack_indexes[r.id] = ind++;
                          return r.id;
                });
                racks_svg.enter().append("rect").attr("class", "rack");
                racks_svg
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
                                if(!heat_map)
                                        return "#FFA500";
                                else{
                                        if(d.hasOwnProperty('rack_score'))
                                            return get_popularity_colour_code(d.rack_score);
                                        return "#FFA500";
                                }
                        })
                        .attr("stroke-width", (tile_height + tile_width) / 16)
                        .attr("id", function(d){return "rack_"+d.id});
                        racks_svg.exit().remove();
                        var rackheads = svg
                                .selectAll(".rackhead")
                                .data(rackdata, function(d){
                                        return d.id;
                                });
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
                        .attr("fill", "black")
                        .attr("id", function(d){
                                return("rackhead_"+d.id);
                        });
                rackheads.exit().remove();
        }

        function render_bots() {
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
                            ////console.log(".bot");
                            ////console.log(d);
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
                    .attr("id", function(d){return "bot_"+d.id;})
                    .attr("fill", "#de3c85")

                bots.on('mouseover', function(d) {
                        var botbox = d3
                              .selectAll('div.binfo')
                              .filter(function(d1) {
                                if(d1 == d){
                                    var topPos = document.getElementById('binfo_'+d.id).offsetTop;
                                    document.getElementById("binfoList").scrollTop = topPos - 200;
                                }
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
                bots.on('contextmenu', d3.contextMenu(menu));
                bots.exit().remove();

                var botheads = svg
                    .selectAll(".bothead")
                    .data(botdata, function (d) {
                      return d.id;
                    });
                botheads.enter().append("rect").attr("class", "bothead").attr("id", function(d){return "bothead_"+d.id;});
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


        function render_rightbar() {
                var fontSize = $("body").css('font-size');
                var lineHeight = Math.floor(parseInt(fontSize.replace('px','')) * 1.5);
                var numElements = 10;

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
                      document.getElementById('binfoContent'+data.id).parentNode.style.height=lineHeight*(numElements) + 'px';
                      console.log(data.maximized_height);
                    });
                  });
                d3.select("button#binfoListCollapse")
                  .on("click", function() {
                    botdata.forEach(function(data) {
                      data.minimized = true;
                      document.getElementById('binfoContent'+data.id).style.display='none';
                      document.getElementById('binfoContent'+data.id).parentNode.style.height='20px';
                    });
                  });
                // botdata
                var textTiles = d3.select("div#binfoList")
                  .selectAll("div.binfo")
                  .data(botdata, function (d, ind) {
                    return d.id;
                  });
                var binfoTiles = textTiles.enter().append("div").attr("class", "binfo").attr("id", function(d){ return "binfo_"+d.id;});
                textTiles.style("height", function(d) {
                  if(d.minimized) {
                    return  '20px';
                  }
                  else {
                    return lineHeight*(numElements) + 'px';
                    console.log(d.maximized_height);
                  }
                });
                var binfoToggleButton = binfoTiles.append("div").attr("class", "binfoToggleButton").attr("id", function (d) {
                  return "binfoToggleButton"+d.id;
                });
                binfoToggleButton.append("span").attr("class", "butler_id");
                binfoToggleButton.append("span").attr("class", "butler_display_id");
                binfoToggleButton.append("span").attr("class", "butler_state");
                d3.selectAll("div.binfoToggleButton")
                  .data(botdata, function (d, ind) {
                    return d.id;
                  })
                  .on("click", function(d) {
                    if(d.minimized) {
                      d.minimized = false;
                      document.getElementById('binfoContent'+d.id).style.display='block';
                      console.log(d.maximized_height);
                      document.getElementById('binfoContent'+d.id).parentNode.style.height=lineHeight*(numElements) + 'px';
                    }
                    else {
                      d.minimized = true;
                      document.getElementById('binfoContent'+d.id).style.display='none';
                      document.getElementById('binfoContent'+d.id).parentNode.style.height='20px';
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
                binfoContent.append("span").attr("class", "butler_debug_vars");
                binfoContent.append("span").attr("class", "butler_address");
                var binfoUpdates = textTiles.transition().duration(transition_duration);
                binfoUpdates.select("span.butler_id").text(function (d) {
                        return d.id;
                });
                binfoUpdates.select("span.butler_state")
                  .attr("class", function (d) {
                    if (d.state === "online") {
                      return "butler_state butler_on";
                    } else {
                      return "butler_state butler_off";
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
                  }).text(function (d) {
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
                textTiles.exit().remove();
        }


        function get_popularity_colour_code(score) {
                if (score == 0.0){
                        score = 0.0001; // Hue cannot be zero
                };
                if(score==="" || score==="undefined" || score === null){
                        score = 0.0001;
                }
                var saturation = 1;
                var value = 1;
                var hue = score*280.0/360.0;
                var c_code = HSVtoRGB_HEX(hue,saturation,value);
                return c_code
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
});


function d3_move(x, y) {
        return " M" + x + "," + y;
}

function d3_line(x, y) {
        return " L" + x + "," + y;
}

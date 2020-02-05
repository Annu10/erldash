

//const sampleJson =


 var Accordian = React.createClass({

  getInitialState: function() {
    return {
      sample_tree_data: [],
      sample_str: "hello You"
      /*
      pps_ids: [],
      pps_data: {},
      seat_data : {},
      task_data : {},
      bin_data : {},
      crash_data : [],
      showTasks : true,
      showBins : false,
      showSeats : false,
      selected_pps : "All",
      selected_bin : "All",
      selected_view : "task_view",
      mode : globalModeVar,
      active_pps : [],
      dead_pps : [],
      showPickInstructions : true
      */
    };
  },


  render: function() {
    var sample_str = this.state.sample_str;
    var tree_data = this.state.tree_data;


    return (
        <div className="panel-group" id="accordion">


            <h3>{sample_str}</h3>
            {tree_data}
        </div>
    );
  }
});



var accordian = ReactDOM.render(
  <Accordian />,
  document.getElementById('container')
);
requirejs.config({
    paths: {
        'jquery': 'jquery-1.10.2',
        'jquery-ui': 'jquery-ui-1.10.4.custom',
        'd3': 'd3',
        'underscore': 'underscore',
        'sweetalert':'sweetalert.min'
    }
});
require(['jquery'], function(){
        require(['jquery-ui'], function(){
                require(['d3', 'sweetalert'], function(){
                        require(['history_viewer_d3']);
                });
        });

});

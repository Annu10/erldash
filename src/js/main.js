requirejs.config({
    paths: {
        'jquery': 'jquery-1.10.2',
        'jquery-ui': 'jquery-ui-1.10.4.custom',
        'd3': 'd3',
        'underscore': 'underscore',
        'sweetalert':'sweetalert.min',
        'd3map': 'd3map'
    }
});
require(['jquery'], function(){
        require(['jquery-ui'], function(){
                require(['d3', 'sweetalert'], function(){
                        require(['d3map']);
                });
        });

});

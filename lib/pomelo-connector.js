var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    httpService = require('./http-service/http-service')

/**
 *
 * @param port
 * @param host
 * @returns {connector}
 */
var connector = function( port, host, opts ){
    if( !(this instanceof connector ) ){
        return new connector(port, host);
    }
    EventEmitter.call(this);

    this.host = host;
    this.port = port;
}

util.inherits(connector,EventEmitter);
module.exports = connector;


/**
 *
 * @param cb
 */
connector.prototype.start = function( cb ){
    var pomelo = require('pomelo'),logger = require('pomelo-logger').getLogger('pomelo');
    if( !pomelo || !logger ){
        console.error("这个插件必须依赖外部项目引用pomelo & pomelo-logger.请检测外部项目的package.json文件.");
        return;
    }
    var config = pomelo.app.get('connectorConfig');
    config.base = pomelo.app.base;
    config.logger = logger;
    this.service = new httpService(config);
    var methods = this.service.methods = {
        post:config.method === 'all' ? true : config.method === 'post' ? true : false,
        get:config.method === 'all' ? true : config.method === 'get' ? true : false
    };
    this.service.on('connection',this.emit.bind(this,'connection'));
    this.service.filter(function ( request, cb ) {
        if( !methods[request.method.toLowerCase()] ){
            cb('no support method '+request.method.toLowerCase());
            return;
        }
        cb();
    });
    this.service.listen( this.port, this.host );
}

/**
 *
 * @param force
 * @param cb
 */
connector.prototype.stop = function( force, cb ){
    this.service.close(cb);
}

/**
 *
 * @type {decode}
 */
connector.decode = connector.prototype.decode = function( msg ){
    return {
        id:msg.params.id | 0,
        route:msg.route,
        body:[msg.body,msg.params]
    }
}

/**
 *
 * @type {encode}
 */
connector.encode = connector.prototype.encode = function( reqID, route, msg ){
    if( reqID ){
        return msg;
    }else{
        return JSON.stringify({route:route,body:msg});
    }
}

/**
 *
 * @param msg
 */
connector.prototype.send = function( msg ){
    this.msg = msg;
}
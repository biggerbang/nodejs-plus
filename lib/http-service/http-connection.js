
var util = require('util'),
    EventEmitter = require('events').EventEmitter

var ST_INITED = 0;
var ST_CLOSED = 1;

var connection = function( id, socket ){
    EventEmitter.call(this);

    this.id = id;
    this.socket = socket;

    this.socket.on('close', this.emit.bind(this,'disconnect'));
    this.socket.on('error', this.emit.bind(this,'error'));
    this.socket.on('finish',this.emit.bind(this,'disconnect'));

    this.remoteAddress = socket.connection.remoteAddress;
    this.state = ST_INITED;
}
util.inherits(connection,EventEmitter);
module.exports = connection;

/**
 * 断开连接
 */
connection.prototype.disconnect = function(){
    if( this.state == ST_CLOSED ){
        return;
    }
    this.state = ST_CLOSED;
    this.socket.end();
}

/**
 * 发送数据
 * @param msg
 */
connection.prototype.send = function( msg ){
    this.socket.end(typeof  msg === 'object' ? JSON.stringify(msg) : msg.toString() );
}
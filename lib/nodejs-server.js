
var path = require('path')
var server = module.exports = {};
var filename = __filename;

var UNKNOWN = 0;
var INITED = 1;
var STARTED = 2;

server.state = UNKNOWN;

/**
 * 初始化
 */
server.init  = function(){
    if( this.state && this.state >= INITED ){
        return;
    }
    this.settings = {};

    var args = parseArgs( process.argv );

    this.components = {};

    this.base = path.dirname(args.main);
    this.env = args.env || 'development';

    this.state = INITED;
    this.logger = console;
}

/**
 * 启动框架
 * @param cb
 */
server.start = function( cb ){
    if( this.state >= STARTED ){
        cb( new Error("This application was started.") );
        return;
    }

    for( var i in this.get('services').components ){
        var component = this.get('services').components[i];
        this.components[ component.name ] = require(path.dirname(filename) + '/components/'+component.type)( component, this );
    }

    for( var i in this.components ){
        this.components[i].start();
    }

    if( typeof cb === "function" ){
        cb(null);
    }
    this.state = STARTED;
}

/**
 *
 * @param key
 * @param value
 * @param attach
 * @returns {*}
 */
server.set = function( key, value, attach ){
    if( arguments.length === 1 ){
        return this.settings[key];
    }
    this.settings[key] = value;
    if( attach ){
        this[key] = value;
    }
}

/**
 *
 * @param key
 * @returns {*}
 */
server.get = function( key ){
    return this.settings[key];
}

/**
 *
 * @param env
 * @param cb
 */
server.config = function( env, cb ){
    if( this.state === UNKNOWN ){
        cb( new Error('Application state error, please call application.init(options) function.') );
        return;
    }
    if( typeof env === 'string' && typeof cb === 'function' ){
        var envs = env.split('|');
        if( envs.indexOf( this.env ) !== -1 ){
            cb(null);
        }
    }
}

/**
 *
 * @param key
 * @param filename
 */
server.loadConfig = function( key, filename ){
    var val = require(filename);
    val = val[this.env] || val;
    this.set(key,val);
}


var parseArgs = function(args) {
    var argsMap = {};
    var mainPos = 1;

    while ( args[mainPos].indexOf('--') > 0) {
        mainPos++;
    }
    argsMap.main = args[mainPos];

    for (var i = (mainPos + 1); i < args.length; i++) {
        var arg = args[i];
        var sep = arg.indexOf('=');
        var key = arg.slice(0, sep);
        var value = arg.slice(sep + 1);
        if (!isNaN(parseInt(value, 10)) && (value.indexOf('.') < 0)) {
            value = parseInt(value, 10);
        }
        argsMap[key] = value;
    }
    return argsMap;
};
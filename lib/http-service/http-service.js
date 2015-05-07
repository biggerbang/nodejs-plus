var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    qs = require('querystring'),
    connection = require('./http-connection'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter

var reqID = 0;
/**
 *
 * @param(object) opts
 */
var service = function( opts ){
    EventEmitter.call(this);

    opts = opts || {base:""};
    if( opts.useSSL ){
        var ssl = {
            key: fs.readFileSync(opts.base + "/" + opts.ssl.key),
            cert:fs.readFileSync(opts.base + "/" + opts.ssl.cert )
        };
        this.proxy = https.createServer(ssl,processMessage.bind(null,this));
    }else{
        this.proxy = http.createServer(processMessage.bind(null,this));
    }

    this.filters = [];
    this.methods = {};
    this.logger = opts.logger ? opts.logger : console;
}
util.inherits(service,EventEmitter);
module.exports = service;

/**
 * 添加消息过滤器
 * @param filter
 */
service.prototype.filter = function( filter ){
    if( typeof filter === 'function' ){
        this.filters.push(filter);
    }
}

/**
 * 开始监听消息
 * @param port
 * @param host
 */
service.prototype.listen = function( port, host ){
    this.proxy.listen(port,host);
}

/**
 * 消息处理函数
 * @param request
 * @param response
 */
var processMessage = function( service, request, response ){
    var connect = new connection( reqID++, response );
    service.emit('connection',connect);
    var req_time = setTimeout(function(){
        service.logger.warn("请求超时");
        connect.send({error:"Request timeout."});
    },1000);
    var bytes = '';
    request.setEncoding('utf8');
    request.addListener('data',function( chunk ){
        bytes += chunk;
    });
    request.addListener('end',function(){
        clearTimeout(req_time);
        process.nextTick(function(){
            var req = process_request(request);
            try{
                req.body = JSON.parse(bytes);
            }catch( e ){
                req.body = {};
                service.logger.warn("请求消息体解析错误:"+JSON.stringify(req));
            }
            for( var i = 0; i < service.filters.length; i++ ){
                if( typeof service.filters[i] === 'function' ){
                    service.filters[i]( req, function( error ){
                        if( error ){
                            service.logger.error("请求不符合路由规则:"+JSON.stringify(req));
                            connect.disconnect();
                            return;
                        }
                    });
                }
            }
            connect.emit('message',req);
        });
    });
}

/**
 * 解析消息头
 * @param request
 * @returns {{httpVersion: *, route: string, params: (*|number), method: (*|string), statusCode: *, headers: (*|string), remoteAddress: (*|connection.remoteAddress)}}
 */
var process_request = function( request ){
    var u = url.parse(request.url);
    return {
        httpVersion:request.httpVersion,
        route: u.pathname.slice(1,u.pathname.length),
        params: qs.parse(u.query),
        method:request.method,
        statusCode:request.statusCode,
        headers:request.headers,
        remoteAddress:request.connection.remoteAddress
    };
}

var httpServer = require('../http-service/http-service'),
    fs = require('fs'),
    path = require('path')

module.exports = function( opts, app ){
    return new component(opts,app);
}

var component = function( opt, app ){
    this.app = app;
    this.opts = opt || {};
    this.opts.base = app.base;
    this.opts.logger = app.logger;
    this.service = new httpServer(this.opts);
    this.sessions = {};

    var self = this;
    this.service.on('connection',function( con ){
        self.sessions[con.id] = con;
        con.on('disconnect',function(){
            delete self.sessions[con.id];
        });
        con.on('error',function( error ){
            self.app.logger.error('connection has error:'+error);
        });
        con.on('message',function( message ){
            if( !self.service.methods[message.method.toLowerCase()] ){
                con.send({error:"Does`t support this request."});
                return;
            }
            process.nextTick( function(){
                if( typeof self.service.methods[message.method.toLowerCase()][message.route] === 'function'){
                    self.service.methods[message.method.toLowerCase()][message.route]( message, function( error, msg ){
                        if( error ){
                            con.send({error:error.message});
                            return;
                        }
                        con.send(msg);
                    });
                }
            });
        });
    });
    /// 白名单测试
    this.service.filter( function( request, callback ){
        if( !self.opts.secure || self.opts.secure.length === 0 ){
            callback(null,request);
            return;
        }
        if( self.opts.secure.indexOf(request.remoteAddress) === -1 ){
            callback(new Error("You don`t have access, please contact the service administrator."));
            return;
        }
        callback(null,request);
    });
    /// 黑名单测试
    this.service.filter(function( request, callback ){
        if( !self.opts.ban || self.opts.ban.length === 0 ){
            callback(null,request);
            return;
        }
        if( self.opts.ban.indexOf(request.remoteAddress) !== -1 ){
            callback(new Error("You don`t have access, please contact the service administrator."));
            return;
        }
        callback(null,request);
    });

    /// 预加载post方法
    try{
        var files = fs.readdirSync( this.app.base + "/app/services/"+ this.opts.name+"/post/" );
        files.forEach(function( item ){
            if( path.extname(item) === ".js" ){
                if( ! self.service.methods['post'] ){
                    self.service.methods['post'] = {};
                }
                var fun = require(self.app.base + "/app/services/"+ self.opts.name+"/post/" + path.basename(item) );
                if( typeof fun === "function" ){
                    self.service.methods['post'][path.basename(item,'.js')] = fun;
                }
            }
        });
    }catch( exception ){
        this.app.logger.error("预加载post服务出错:"+exception);
    }

    /// 预加载get方法
    try{
        var files = fs.readdirSync( this.app.base + "/app/services/"+ this.opts.name+"/get/" );
        files.forEach(function( item ){
            if( path.extname(item) === ".js" ){
                if( ! self.service.methods['get'] ){
                    self.service.methods['get'] = {};
                }
                var fun = require(self.app.base + "/app/services/"+ self.opts.name+"/get/" + path.basename(item) );
                if( typeof fun === "function" ){
                    self.service.methods['get'][path.basename(item,'.js')] = fun;
                }
            }
        });
    }catch( exception ){
        this.app.logger.error("预加载get服务出错:"+exception);
    }
}

component.prototype.start = function(){
    this.service.listen( this.opts.port, this.opts.host );
}

component.prototype.stop = function(){
    if( this.service ){
        this.service.close();
        delete this.service;
        this.service = null;
    }
}
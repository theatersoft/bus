/*
 Copyright (C) 2016 Theatersoft

 This program is free software: you can redistribute it and/or modify it under
 the terms of the GNU Affero General Public License as published by the Free
 Software Foundation, version 3.

 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 details.

 You should have received a copy of the GNU Affero General Public License along
 with this program. If not, see <http://www.gnu.org/licenses/>
  */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var WebSocket = require('ws');
var WebSocket__default = _interopDefault(WebSocket);

class EventEmitter {
    constructor () {
        this.events = new Map()
    }
    addListener (type, callback) {
        this.events.has(type) || this.events.set(type, [])
        this.events.get(type).push(callback)
        return this
    }
    //removeListener (type, callback) {
    //    let
    //        events = this.events.get(type),
    //        index
    //
    //    if (events && events.length) {
    //        index = events.reduce((i, event, index) => {
    //            return (typeof event === 'function' && event === callback)
    //                ?  i = index
    //                : i
    //        }, -1)
    //
    //        if (index > -1) {
    //            events.splice(index, 1)
    //            this.events.set(type, events)
    //            return true
    //        }
    //    }
    //    return false
    //}
    emit (type, ...args) {
        let events = this.events.get(type)
        if (events && events.length) {
            events.forEach(event =>
                event(...args))
            return true
        }
        return false
    }
}

EventEmitter.prototype.on = EventEmitter.prototype.addListener

let bus;
let _i

class Manager {
    constructor () {
        this.names = new Map()
        console.log('Manager started')
    }

    init (_bus, _impl) {
        if (bus) throw 'reinited'
        bus = _bus
        _i = _impl
        console.log('Manager init')
    }

    // TODO needs request metadata: sender
    requestName (name, node) {
        console.log('Manager.requestName')
    }

    releaseName (name, node) {
        console.log('Manager.releaseName')
    }

    register (name, obj) {
        if (_i.node.root) {
            console.log('Manager.register as root ')
            //bus.registerObject(name, obj)
            this.names.set(name, obj)
            return Promise.resolve(true) // TODO BusObject
        } else {
            console.log('Manager.register as child ')
            return bus.request('/Bus.requestName', name, _i.node.name).then(r => {
                console.log('Manager.registered ')
                this.names.set(name, obj)
                return true
            })
        }
    }
}

//class BusEmitter {
//
//}
//
//class BusObject {
//    constructor (bus) {
//        this.bus = bus
//        this._emitter = new BusEmitter()
//    }
//
//    get emitter () {return this._emitter}
//}

var manager$1 = new Manager()

const node = {
        //bus,
        //name,
        //server,
        connections: [undefined],
        objects: {},
        reqid: 0,
        requests: {},
        signals: new EventEmitter()
    };
const addChild = child => {
        child.id = node.connections.length
        child.name = `${node.name}${child.id}`
        console.log(`${node.name} adding child ${child.name}`)
        node.connections.push(child)
        child.send({hello: `${child.name}/`})
    };
const startServer = context => {
        if (context.children) {
            node.server = Connection$1.createServer(context.children)
                .on('connection', connection => {
                    addChild(bind(connection))
                })
                .on('error', err => {
                    console.log('server error', err)
                })
        }
    };
const route = n => {
        let i = n.lastIndexOf('/')
        if (i === -1) throw new Error('Invalid name')
        let
            path = n.slice(0, i + 1),
            r = path === node.name ? null
                : path.startsWith((node.name)) ? node.connections[parseInt(path.slice(node.name.length))]
                : node.connections[0]
        //console.log(`routing to ${path} from ${node.name} returns ${r && r.name}`)
        return r
    };
const bind = conn => {
        return conn
            .on('data', data => {
                //console.log(`data from ${conn.name}`, data)
                if (data.req) {
                    request(data.req).then(
                        res =>
                            reply({id: data.req.id, path: data.req.sender, args: res}),
                        err =>
                            console.log(err))
                } else if (data.res) {
                    reply(data.res)
                } else if (data.sig) {
                    signal(data.sig, conn.id)
                }
            })
            .on('close', () => {
                console.log(`connection close ${conn.name}`)
                node.connections[conn.id] = undefined
            })
    };
const request = req => {
        let conn = route(req.path)
        if (conn) {
            if (req.sender)
                conn.send({req})
            else {
                req.sender = node.name
                return new Promise((r, j) => {
                    req.id = node.reqid++
                    conn.send({req})
                    node.requests[req.id] = {r, j, req}
                })
            }
        } else if (conn === null) {
            let obj = node.objects[req.interface] && node.objects[req.interface].obj
            if (!obj) return Promise.reject(`Error interface ${req.interface} object not found`)
            let member = obj[req.member], args = req.args // workaround uglify parse error
            if (!member) return Promise.reject(`Error member ${req.member} not found`)
            try {
                return Promise.resolve(obj[req.member](...args))
            }
            catch (e) {
                return Promise.reject(`Exception calling interface ${req.interface} object member ${req.member} ${e}`)
            }
        }
        else if (conn === undefined)
            return Promise.reject('connection error') // TODO
    };
const reply = res => {
        let conn = route(res.path)
        if (conn)
            conn.send({res})
        else {
            let r = node.requests[res.id]
            delete node.requests[res.id]
            r.r(res.args)
        }
    };
const sigroute = (name, from) => {
        let r = node.connections.filter(c => c && c.id !== from)
        //console.log(`sigrouting ${name} from ${from} returns ${r.map(c => c.id)}`)
        return r
    };
const signal = (sig, from) => {
        node.signals.emit(sig.name, sig.args)
        sigroute(sig.name, from).forEach(c => c && c.send({sig}))
    };
const close = () => {
    };
const initManager = bus => manager$1.init(bus, {
        node, request, signal, // TODO
    })

var Connection$1

var node$1 = {
    get bus () {return node.bus},
    set bus (b) {node.bus = b},

    set Connection (c) {Connection$1 = c},

    connections: node.connections,

    get name () {return node.name},
    set name (n) {node.name = n},

    objects: node.objects,
    signals: node.signals,

    addChild,
    startServer,
    route,
    bind,
    request,
    reply,
    sigroute,
    signal,
    close,
    initManager
}

const Executor = (_r, _j) => ({
    promise: new Promise((r, j) => {_r = r; _j = j}),
    resolve: v => _r(v),
    reject: e => _j(e)
})
let busExecutor = Executor()

class Bus extends EventEmitter {
    static start () {
        if (Connection && !node$1.bus) {
            let bus = new Bus(Connection.context)
                .on('connect', () => {
                    node$1.bus = bus
                    busExecutor.resolve(bus)
                })
        }
        return busExecutor.promise
    }

    constructor (context) {
        super()
        if (!context) throw new Error('Invalid bus context')
        if (context.parent) {
            let conn = node$1.bind(Connection.createParentConnection(context.parent)
                .on('open', () => {
                    console.log('parent open')
                })
                .on('data', data => {
                    if (data.hello) {
                        console.log(`bus name is ${data.hello}`)
                        node$1.name = data.hello
                        conn.name = `${node$1.name}0`
                        node$1.initManager()
                        node$1.startServer(context)
                        this.emit('connect')
                    }
                })
                .on('error', err => {
                    console.log('parent error', err)
                }))
            conn.id = 0
            node$1.connections[0] = conn
        } else {
            node$1.root = true
            node$1.name = '/'
            node$1.initManager()
            node$1.startServer(context)
            setImmediate(() => this.emit('connect'))
        }
    }

    get name () {
        return node$1.name
    }

    registerObject (name, obj, iface = (methods(obj))) {
        console.log(`registerObject ${name} at ${node$1.name} interface`, iface)
        node$1.objects[name] = {obj, iface}
    }

    unregisterObject () {
        //TODO
    }

    request (name, ...args) {
        console.log('request', name, args)
        const [, path, iface, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node$1.request({path, interface: iface, member, args})
            .catch(e => {
                console.log(`request ${name} rejected ${e}`)
                throw e
            })
    }

    signal (name, args) {
        //console.log('signal', name, args)
        const [, path, iface, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node$1.signal({name, path, interface: iface, member, args})
    }

    registerListener (name, cb) {
        //const [, path, iface, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        //TODO
        node$1.signals.on(name, cb)
    }

    unregisterListener () {
        //TODO
    }

    close () {
        node$1.close
    }
}

let Connection //setConnection

function setConnection (value) {
    if (Connection) throw new Error('Cannot change Connection')
    Connection = node$1.Connection = value
}

var Bus$1 = {
    start (context) {
        Connection.create(context)
        return Bus.start()
    },
    get bus () {
        if (!node$1.bus) throw new Error('Bus not started')
        return node$1.bus
    },
    proxy (iface) {
        return new Proxy({}, {
            get (_, name) {
                return (...args) =>
                    node$1.request({path: '/', interface: iface, member: name, args})
            }
        })
    }
}

const url = process.env.BUS || 'ws://localhost:5453'

class Connection$2 extends EventEmitter {
    constructor (ws) {
        super()
        this.ws = ws
            .on('open', () =>
                this.emit('open'))
            .on('message', (data, flags) =>
                this.emit('data', JSON.parse(data)))
            .on('close', () =>
                this.emit('close'))
            .on('error', err =>
                this.emit('error', err))
    }

    send (data) {
        //console.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

class Server$1 extends EventEmitter {
    constructor (wss) {
        super()
        wss
            .on('connection', ws => {
                console.log(`new connection to ${ws.upgradeReq.headers.host}`)
                this.emit('connection', new Connection$2(ws))
            })
            .on('close', (code, msg) =>
                this.emit('close'))
            .on('error', err =>
                this.emit('error', err))
    }
}

let context

var Connection$3 = {
    createParentConnection (parent) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        return new Connection$2(new WebSocket__default(parent.url))
    },

    createServer ({host, port, server}) {
        let options
        if (server) {
            options = {server}
            console.log(`connecting ws server to http server`)
        } else {
            options = {host, port}
            console.log(`starting ws server on ${host}:${port}`)
        }
        return new Server$1(new WebSocket.Server(options))
    },

    create (context = {parent: {url}}) {
        this.context = context
        return this
    },

    set context (value) {
        if (context) throw new Error('Cannot change context')
        context = value
    },

    get context () {
        return context
    }
}

setConnection(Connection$3)

exports.Bus = Bus$1;
exports.Connection = Connection$3;
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVzLmpzIiwic291cmNlcyI6WyIuLi9zcmMvRXZlbnRFbWl0dGVyLmpzIiwiLi4vc3JjL01hbmFnZXIuanMiLCIuLi9zcmMvbm9kZS5qcyIsIi4uL3NyYy9CdXMuanMiLCIuLi9zcmMvQ29ubmVjdGlvbi5qcyIsIi4uL3NyYy9idW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gbmV3IE1hcCgpXG4gICAgfVxuICAgIGFkZExpc3RlbmVyICh0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmV2ZW50cy5oYXModHlwZSkgfHwgdGhpcy5ldmVudHMuc2V0KHR5cGUsIFtdKVxuICAgICAgICB0aGlzLmV2ZW50cy5nZXQodHlwZSkucHVzaChjYWxsYmFjaylcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgLy9yZW1vdmVMaXN0ZW5lciAodHlwZSwgY2FsbGJhY2spIHtcbiAgICAvLyAgICBsZXRcbiAgICAvLyAgICAgICAgZXZlbnRzID0gdGhpcy5ldmVudHMuZ2V0KHR5cGUpLFxuICAgIC8vICAgICAgICBpbmRleFxuICAgIC8vXG4gICAgLy8gICAgaWYgKGV2ZW50cyAmJiBldmVudHMubGVuZ3RoKSB7XG4gICAgLy8gICAgICAgIGluZGV4ID0gZXZlbnRzLnJlZHVjZSgoaSwgZXZlbnQsIGluZGV4KSA9PiB7XG4gICAgLy8gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBldmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBldmVudCA9PT0gY2FsbGJhY2spXG4gICAgLy8gICAgICAgICAgICAgICAgPyAgaSA9IGluZGV4XG4gICAgLy8gICAgICAgICAgICAgICAgOiBpXG4gICAgLy8gICAgICAgIH0sIC0xKVxuICAgIC8vXG4gICAgLy8gICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgLy8gICAgICAgICAgICBldmVudHMuc3BsaWNlKGluZGV4LCAxKVxuICAgIC8vICAgICAgICAgICAgdGhpcy5ldmVudHMuc2V0KHR5cGUsIGV2ZW50cylcbiAgICAvLyAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgLy8gICAgICAgIH1cbiAgICAvLyAgICB9XG4gICAgLy8gICAgcmV0dXJuIGZhbHNlXG4gICAgLy99XG4gICAgZW1pdCAodHlwZSwgLi4uYXJncykge1xuICAgICAgICBsZXQgZXZlbnRzID0gdGhpcy5ldmVudHMuZ2V0KHR5cGUpXG4gICAgICAgIGlmIChldmVudHMgJiYgZXZlbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgZXZlbnRzLmZvckVhY2goZXZlbnQgPT5cbiAgICAgICAgICAgICAgICBldmVudCguLi5hcmdzKSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lclxuXG5leHBvcnQgZGVmYXVsdCBFdmVudEVtaXR0ZXIiLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuXG5sZXQgbWFuYWdlciwgYnVzLCBfaVxuXG5jbGFzcyBNYW5hZ2VyIHtcbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHRoaXMubmFtZXMgPSBuZXcgTWFwKClcbiAgICAgICAgY29uc29sZS5sb2coJ01hbmFnZXIgc3RhcnRlZCcpXG4gICAgfVxuXG4gICAgaW5pdCAoX2J1cywgX2ltcGwpIHtcbiAgICAgICAgaWYgKGJ1cykgdGhyb3cgJ3JlaW5pdGVkJ1xuICAgICAgICBidXMgPSBfYnVzXG4gICAgICAgIF9pID0gX2ltcGxcbiAgICAgICAgY29uc29sZS5sb2coJ01hbmFnZXIgaW5pdCcpXG4gICAgfVxuXG4gICAgLy8gVE9ETyBuZWVkcyByZXF1ZXN0IG1ldGFkYXRhOiBzZW5kZXJcbiAgICByZXF1ZXN0TmFtZSAobmFtZSwgbm9kZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZXF1ZXN0TmFtZScpXG4gICAgfVxuXG4gICAgcmVsZWFzZU5hbWUgKG5hbWUsIG5vZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ01hbmFnZXIucmVsZWFzZU5hbWUnKVxuICAgIH1cblxuICAgIHJlZ2lzdGVyIChuYW1lLCBvYmopIHtcbiAgICAgICAgaWYgKF9pLm5vZGUucm9vdCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ01hbmFnZXIucmVnaXN0ZXIgYXMgcm9vdCAnKVxuICAgICAgICAgICAgLy9idXMucmVnaXN0ZXJPYmplY3QobmFtZSwgb2JqKVxuICAgICAgICAgICAgdGhpcy5uYW1lcy5zZXQobmFtZSwgb2JqKVxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKSAvLyBUT0RPIEJ1c09iamVjdFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ01hbmFnZXIucmVnaXN0ZXIgYXMgY2hpbGQgJylcbiAgICAgICAgICAgIHJldHVybiBidXMucmVxdWVzdCgnL0J1cy5yZXF1ZXN0TmFtZScsIG5hbWUsIF9pLm5vZGUubmFtZSkudGhlbihyID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWdpc3RlcmVkICcpXG4gICAgICAgICAgICAgICAgdGhpcy5uYW1lcy5zZXQobmFtZSwgb2JqKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vL2NsYXNzIEJ1c0VtaXR0ZXIge1xuLy9cbi8vfVxuLy9cbi8vY2xhc3MgQnVzT2JqZWN0IHtcbi8vICAgIGNvbnN0cnVjdG9yIChidXMpIHtcbi8vICAgICAgICB0aGlzLmJ1cyA9IGJ1c1xuLy8gICAgICAgIHRoaXMuX2VtaXR0ZXIgPSBuZXcgQnVzRW1pdHRlcigpXG4vLyAgICB9XG4vL1xuLy8gICAgZ2V0IGVtaXR0ZXIgKCkge3JldHVybiB0aGlzLl9lbWl0dGVyfVxuLy99XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBNYW5hZ2VyKCkiLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuaW1wb3J0IG1hbmFnZXIgZnJvbSAnLi9NYW5hZ2VyJ1xuXG5jb25zdFxuICAgIG5vZGUgPSB7XG4gICAgICAgIC8vYnVzLFxuICAgICAgICAvL25hbWUsXG4gICAgICAgIC8vc2VydmVyLFxuICAgICAgICBjb25uZWN0aW9uczogW3VuZGVmaW5lZF0sXG4gICAgICAgIG9iamVjdHM6IHt9LFxuICAgICAgICByZXFpZDogMCxcbiAgICAgICAgcmVxdWVzdHM6IHt9LFxuICAgICAgICBzaWduYWxzOiBuZXcgRXZlbnRFbWl0dGVyKClcbiAgICB9LFxuICAgIGFkZENoaWxkID0gY2hpbGQgPT4ge1xuICAgICAgICBjaGlsZC5pZCA9IG5vZGUuY29ubmVjdGlvbnMubGVuZ3RoXG4gICAgICAgIGNoaWxkLm5hbWUgPSBgJHtub2RlLm5hbWV9JHtjaGlsZC5pZH1gXG4gICAgICAgIGNvbnNvbGUubG9nKGAke25vZGUubmFtZX0gYWRkaW5nIGNoaWxkICR7Y2hpbGQubmFtZX1gKVxuICAgICAgICBub2RlLmNvbm5lY3Rpb25zLnB1c2goY2hpbGQpXG4gICAgICAgIGNoaWxkLnNlbmQoe2hlbGxvOiBgJHtjaGlsZC5uYW1lfS9gfSlcbiAgICB9LFxuICAgIHN0YXJ0U2VydmVyID0gY29udGV4dCA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0LmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBub2RlLnNlcnZlciA9IENvbm5lY3Rpb24uY3JlYXRlU2VydmVyKGNvbnRleHQuY2hpbGRyZW4pXG4gICAgICAgICAgICAgICAgLm9uKCdjb25uZWN0aW9uJywgY29ubmVjdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGFkZENoaWxkKGJpbmQoY29ubmVjdGlvbikpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NlcnZlciBlcnJvcicsIGVycilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfSxcbiAgICByb3V0ZSA9IG4gPT4ge1xuICAgICAgICBsZXQgaSA9IG4ubGFzdEluZGV4T2YoJy8nKVxuICAgICAgICBpZiAoaSA9PT0gLTEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBuYW1lJylcbiAgICAgICAgbGV0XG4gICAgICAgICAgICBwYXRoID0gbi5zbGljZSgwLCBpICsgMSksXG4gICAgICAgICAgICByID0gcGF0aCA9PT0gbm9kZS5uYW1lID8gbnVsbFxuICAgICAgICAgICAgICAgIDogcGF0aC5zdGFydHNXaXRoKChub2RlLm5hbWUpKSA/IG5vZGUuY29ubmVjdGlvbnNbcGFyc2VJbnQocGF0aC5zbGljZShub2RlLm5hbWUubGVuZ3RoKSldXG4gICAgICAgICAgICAgICAgOiBub2RlLmNvbm5lY3Rpb25zWzBdXG4gICAgICAgIC8vY29uc29sZS5sb2coYHJvdXRpbmcgdG8gJHtwYXRofSBmcm9tICR7bm9kZS5uYW1lfSByZXR1cm5zICR7ciAmJiByLm5hbWV9YClcbiAgICAgICAgcmV0dXJuIHJcbiAgICB9LFxuICAgIGJpbmQgPSBjb25uID0+IHtcbiAgICAgICAgcmV0dXJuIGNvbm5cbiAgICAgICAgICAgIC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coYGRhdGEgZnJvbSAke2Nvbm4ubmFtZX1gLCBkYXRhKVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnJlcSkge1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0KGRhdGEucmVxKS50aGVuKFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbHkoe2lkOiBkYXRhLnJlcS5pZCwgcGF0aDogZGF0YS5yZXEuc2VuZGVyLCBhcmdzOiByZXN9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVyciA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycikpXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnJlcykge1xuICAgICAgICAgICAgICAgICAgICByZXBseShkYXRhLnJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEuc2lnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpZ25hbChkYXRhLnNpZywgY29ubi5pZClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgY29ubmVjdGlvbiBjbG9zZSAke2Nvbm4ubmFtZX1gKVxuICAgICAgICAgICAgICAgIG5vZGUuY29ubmVjdGlvbnNbY29ubi5pZF0gPSB1bmRlZmluZWRcbiAgICAgICAgICAgIH0pXG4gICAgfSxcbiAgICByZXF1ZXN0ID0gcmVxID0+IHtcbiAgICAgICAgbGV0IGNvbm4gPSByb3V0ZShyZXEucGF0aClcbiAgICAgICAgaWYgKGNvbm4pIHtcbiAgICAgICAgICAgIGlmIChyZXEuc2VuZGVyKVxuICAgICAgICAgICAgICAgIGNvbm4uc2VuZCh7cmVxfSlcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcS5zZW5kZXIgPSBub2RlLm5hbWVcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHIsIGopID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLmlkID0gbm9kZS5yZXFpZCsrXG4gICAgICAgICAgICAgICAgICAgIGNvbm4uc2VuZCh7cmVxfSlcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZXF1ZXN0c1tyZXEuaWRdID0ge3IsIGosIHJlcX1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvbm4gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGxldCBvYmogPSBub2RlLm9iamVjdHNbcmVxLmludGVyZmFjZV0gJiYgbm9kZS5vYmplY3RzW3JlcS5pbnRlcmZhY2VdLm9ialxuICAgICAgICAgICAgaWYgKCFvYmopIHJldHVybiBQcm9taXNlLnJlamVjdChgRXJyb3IgaW50ZXJmYWNlICR7cmVxLmludGVyZmFjZX0gb2JqZWN0IG5vdCBmb3VuZGApXG4gICAgICAgICAgICBsZXQgbWVtYmVyID0gb2JqW3JlcS5tZW1iZXJdLCBhcmdzID0gcmVxLmFyZ3MgLy8gd29ya2Fyb3VuZCB1Z2xpZnkgcGFyc2UgZXJyb3JcbiAgICAgICAgICAgIGlmICghbWVtYmVyKSByZXR1cm4gUHJvbWlzZS5yZWplY3QoYEVycm9yIG1lbWJlciAke3JlcS5tZW1iZXJ9IG5vdCBmb3VuZGApXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUob2JqW3JlcS5tZW1iZXJdKC4uLmFyZ3MpKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYEV4Y2VwdGlvbiBjYWxsaW5nIGludGVyZmFjZSAke3JlcS5pbnRlcmZhY2V9IG9iamVjdCBtZW1iZXIgJHtyZXEubWVtYmVyfSAke2V9YClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjb25uID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ2Nvbm5lY3Rpb24gZXJyb3InKSAvLyBUT0RPXG4gICAgfSxcbiAgICByZXBseSA9IHJlcyA9PiB7XG4gICAgICAgIGxldCBjb25uID0gcm91dGUocmVzLnBhdGgpXG4gICAgICAgIGlmIChjb25uKVxuICAgICAgICAgICAgY29ubi5zZW5kKHtyZXN9KVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCByID0gbm9kZS5yZXF1ZXN0c1tyZXMuaWRdXG4gICAgICAgICAgICBkZWxldGUgbm9kZS5yZXF1ZXN0c1tyZXMuaWRdXG4gICAgICAgICAgICByLnIocmVzLmFyZ3MpXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNpZ3JvdXRlID0gKG5hbWUsIGZyb20pID0+IHtcbiAgICAgICAgbGV0IHIgPSBub2RlLmNvbm5lY3Rpb25zLmZpbHRlcihjID0+IGMgJiYgYy5pZCAhPT0gZnJvbSlcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgc2lncm91dGluZyAke25hbWV9IGZyb20gJHtmcm9tfSByZXR1cm5zICR7ci5tYXAoYyA9PiBjLmlkKX1gKVxuICAgICAgICByZXR1cm4gclxuICAgIH0sXG4gICAgc2lnbmFsID0gKHNpZywgZnJvbSkgPT4ge1xuICAgICAgICBub2RlLnNpZ25hbHMuZW1pdChzaWcubmFtZSwgc2lnLmFyZ3MpXG4gICAgICAgIHNpZ3JvdXRlKHNpZy5uYW1lLCBmcm9tKS5mb3JFYWNoKGMgPT4gYyAmJiBjLnNlbmQoe3NpZ30pKVxuICAgIH0sXG4gICAgbWV0aG9kcyA9IG9iaiA9PiB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSlcbiAgICAgICAgICAgIC5maWx0ZXIocCA9PlxuICAgICAgICAgICAgdHlwZW9mIG9ialtwXSA9PT0gJ2Z1bmN0aW9uJyAmJiBwICE9PSAnY29uc3RydWN0b3InKVxuICAgIH0sXG4gICAgY2xvc2UgPSAoKSA9PiB7XG4gICAgfSxcbiAgICBpbml0TWFuYWdlciA9IGJ1cyA9PiBtYW5hZ2VyLmluaXQoYnVzLCB7XG4gICAgICAgIG5vZGUsIHJlcXVlc3QsIHNpZ25hbCwgLy8gVE9ET1xuICAgIH0pXG5cbnZhciBDb25uZWN0aW9uXG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBnZXQgYnVzICgpIHtyZXR1cm4gbm9kZS5idXN9LFxuICAgIHNldCBidXMgKGIpIHtub2RlLmJ1cyA9IGJ9LFxuXG4gICAgc2V0IENvbm5lY3Rpb24gKGMpIHtDb25uZWN0aW9uID0gY30sXG5cbiAgICBjb25uZWN0aW9uczogbm9kZS5jb25uZWN0aW9ucyxcblxuICAgIGdldCBuYW1lICgpIHtyZXR1cm4gbm9kZS5uYW1lfSxcbiAgICBzZXQgbmFtZSAobikge25vZGUubmFtZSA9IG59LFxuXG4gICAgb2JqZWN0czogbm9kZS5vYmplY3RzLFxuICAgIHNpZ25hbHM6IG5vZGUuc2lnbmFscyxcblxuICAgIGFkZENoaWxkLFxuICAgIHN0YXJ0U2VydmVyLFxuICAgIHJvdXRlLFxuICAgIGJpbmQsXG4gICAgcmVxdWVzdCxcbiAgICByZXBseSxcbiAgICBzaWdyb3V0ZSxcbiAgICBzaWduYWwsXG4gICAgY2xvc2UsXG4gICAgaW5pdE1hbmFnZXJcbn0iLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuaW1wb3J0IG5vZGUgZnJvbSAnLi9ub2RlJ1xuXG5jb25zdCBFeGVjdXRvciA9IChfciwgX2opID0+ICh7XG4gICAgcHJvbWlzZTogbmV3IFByb21pc2UoKHIsIGopID0+IHtfciA9IHI7IF9qID0gan0pLFxuICAgIHJlc29sdmU6IHYgPT4gX3IodiksXG4gICAgcmVqZWN0OiBlID0+IF9qKGUpXG59KVxubGV0IGJ1c0V4ZWN1dG9yID0gRXhlY3V0b3IoKVxuXG5jbGFzcyBCdXMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIHN0YXRpYyBzdGFydCAoKSB7XG4gICAgICAgIGlmIChDb25uZWN0aW9uICYmICFub2RlLmJ1cykge1xuICAgICAgICAgICAgbGV0IGJ1cyA9IG5ldyBCdXMoQ29ubmVjdGlvbi5jb250ZXh0KVxuICAgICAgICAgICAgICAgIC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5idXMgPSBidXNcbiAgICAgICAgICAgICAgICAgICAgYnVzRXhlY3V0b3IucmVzb2x2ZShidXMpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVzRXhlY3V0b3IucHJvbWlzZVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yIChjb250ZXh0KSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgaWYgKCFjb250ZXh0KSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYnVzIGNvbnRleHQnKVxuICAgICAgICBpZiAoY29udGV4dC5wYXJlbnQpIHtcbiAgICAgICAgICAgIGxldCBjb25uID0gbm9kZS5iaW5kKENvbm5lY3Rpb24uY3JlYXRlUGFyZW50Q29ubmVjdGlvbihjb250ZXh0LnBhcmVudClcbiAgICAgICAgICAgICAgICAub24oJ29wZW4nLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJlbnQgb3BlbicpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaGVsbG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBidXMgbmFtZSBpcyAke2RhdGEuaGVsbG99YClcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IGRhdGEuaGVsbG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm4ubmFtZSA9IGAke25vZGUubmFtZX0wYFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5pbml0TWFuYWdlcigpXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0YXJ0U2VydmVyKGNvbnRleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcmVudCBlcnJvcicsIGVycilcbiAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIGNvbm4uaWQgPSAwXG4gICAgICAgICAgICBub2RlLmNvbm5lY3Rpb25zWzBdID0gY29ublxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbm9kZS5yb290ID0gdHJ1ZVxuICAgICAgICAgICAgbm9kZS5uYW1lID0gJy8nXG4gICAgICAgICAgICBub2RlLmluaXRNYW5hZ2VyKClcbiAgICAgICAgICAgIG5vZGUuc3RhcnRTZXJ2ZXIoY29udGV4dClcbiAgICAgICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiB0aGlzLmVtaXQoJ2Nvbm5lY3QnKSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBuYW1lICgpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubmFtZVxuICAgIH1cblxuICAgIHJlZ2lzdGVyT2JqZWN0IChuYW1lLCBvYmosIGlmYWNlID0gKG1ldGhvZHMob2JqKSkpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHJlZ2lzdGVyT2JqZWN0ICR7bmFtZX0gYXQgJHtub2RlLm5hbWV9IGludGVyZmFjZWAsIGlmYWNlKVxuICAgICAgICBub2RlLm9iamVjdHNbbmFtZV0gPSB7b2JqLCBpZmFjZX1cbiAgICB9XG5cbiAgICB1bnJlZ2lzdGVyT2JqZWN0ICgpIHtcbiAgICAgICAgLy9UT0RPXG4gICAgfVxuXG4gICAgcmVxdWVzdCAobmFtZSwgLi4uYXJncykge1xuICAgICAgICBjb25zb2xlLmxvZygncmVxdWVzdCcsIG5hbWUsIGFyZ3MpXG4gICAgICAgIGNvbnN0IFssIHBhdGgsIGlmYWNlLCBtZW1iZXJdID0gL14oWy9cXGRdKykoXFx3KykuKFxcdyspJC8uZXhlYyhuYW1lKVxuICAgICAgICByZXR1cm4gbm9kZS5yZXF1ZXN0KHtwYXRoLCBpbnRlcmZhY2U6IGlmYWNlLCBtZW1iZXIsIGFyZ3N9KVxuICAgICAgICAgICAgLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGByZXF1ZXN0ICR7bmFtZX0gcmVqZWN0ZWQgJHtlfWApXG4gICAgICAgICAgICAgICAgdGhyb3cgZVxuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzaWduYWwgKG5hbWUsIGFyZ3MpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnc2lnbmFsJywgbmFtZSwgYXJncylcbiAgICAgICAgY29uc3QgWywgcGF0aCwgaWZhY2UsIG1lbWJlcl0gPSAvXihbL1xcZF0rKShcXHcrKS4oXFx3KykkLy5leGVjKG5hbWUpXG4gICAgICAgIHJldHVybiBub2RlLnNpZ25hbCh7bmFtZSwgcGF0aCwgaW50ZXJmYWNlOiBpZmFjZSwgbWVtYmVyLCBhcmdzfSlcbiAgICB9XG5cbiAgICByZWdpc3Rlckxpc3RlbmVyIChuYW1lLCBjYikge1xuICAgICAgICAvL2NvbnN0IFssIHBhdGgsIGlmYWNlLCBtZW1iZXJdID0gL14oWy9cXGRdKykoXFx3KykuKFxcdyspJC8uZXhlYyhuYW1lKVxuICAgICAgICAvL1RPRE9cbiAgICAgICAgbm9kZS5zaWduYWxzLm9uKG5hbWUsIGNiKVxuICAgIH1cblxuICAgIHVucmVnaXN0ZXJMaXN0ZW5lciAoKSB7XG4gICAgICAgIC8vVE9ET1xuICAgIH1cblxuICAgIGNsb3NlICgpIHtcbiAgICAgICAgbm9kZS5jbG9zZVxuICAgIH1cbn1cblxubGV0IENvbm5lY3Rpb24gLy9zZXRDb25uZWN0aW9uXG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRDb25uZWN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChDb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjaGFuZ2UgQ29ubmVjdGlvbicpXG4gICAgQ29ubmVjdGlvbiA9IG5vZGUuQ29ubmVjdGlvbiA9IHZhbHVlXG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBzdGFydCAoY29udGV4dCkge1xuICAgICAgICBDb25uZWN0aW9uLmNyZWF0ZShjb250ZXh0KVxuICAgICAgICByZXR1cm4gQnVzLnN0YXJ0KClcbiAgICB9LFxuICAgIGdldCBidXMgKCkge1xuICAgICAgICBpZiAoIW5vZGUuYnVzKSB0aHJvdyBuZXcgRXJyb3IoJ0J1cyBub3Qgc3RhcnRlZCcpXG4gICAgICAgIHJldHVybiBub2RlLmJ1c1xuICAgIH0sXG4gICAgcHJveHkgKGlmYWNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgICAgIGdldCAoXywgbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJncykgPT5cbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZXF1ZXN0KHtwYXRoOiAnLycsIGludGVyZmFjZTogaWZhY2UsIG1lbWJlcjogbmFtZSwgYXJnc30pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiaW1wb3J0IHtkZWZhdWx0IGFzIFdlYlNvY2tldCwgU2VydmVyIGFzIFdlYlNvY2tldFNlcnZlcn0gZnJvbSAnd3MnXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuQlVTIHx8ICd3czovL2xvY2FsaG9zdDo1NDUzJ1xuXG5jbGFzcyBDb25uZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvciAod3MpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICB0aGlzLndzID0gd3NcbiAgICAgICAgICAgIC5vbignb3BlbicsICgpID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdvcGVuJykpXG4gICAgICAgICAgICAub24oJ21lc3NhZ2UnLCAoZGF0YSwgZmxhZ3MpID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdkYXRhJywgSlNPTi5wYXJzZShkYXRhKSkpXG4gICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nsb3NlJykpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycikpXG4gICAgfVxuXG4gICAgc2VuZCAoZGF0YSkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGBjb25uZWN0aW9uICR7dGhpcy5uYW1lfSBzZW5kYCwgZGF0YSlcbiAgICAgICAgdGhpcy53cy5zZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKVxuICAgIH1cbn1cblxuY2xhc3MgU2VydmVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvciAod3NzKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgd3NzXG4gICAgICAgICAgICAub24oJ2Nvbm5lY3Rpb24nLCB3cyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYG5ldyBjb25uZWN0aW9uIHRvICR7d3MudXBncmFkZVJlcS5oZWFkZXJzLmhvc3R9YClcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCBuZXcgQ29ubmVjdGlvbih3cykpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdjbG9zZScsIChjb2RlLCBtc2cpID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdjbG9zZScpKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PlxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpKVxuICAgIH1cbn1cblxubGV0IGNvbnRleHRcblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGNyZWF0ZVBhcmVudENvbm5lY3Rpb24gKHBhcmVudCkge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX1RMU19SRUpFQ1RfVU5BVVRIT1JJWkVEID0gJzAnXG4gICAgICAgIHJldHVybiBuZXcgQ29ubmVjdGlvbihuZXcgV2ViU29ja2V0KHBhcmVudC51cmwpKVxuICAgIH0sXG5cbiAgICBjcmVhdGVTZXJ2ZXIgKHtob3N0LCBwb3J0LCBzZXJ2ZXJ9KSB7XG4gICAgICAgIGxldCBvcHRpb25zXG4gICAgICAgIGlmIChzZXJ2ZXIpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7c2VydmVyfVxuICAgICAgICAgICAgY29uc29sZS5sb2coYGNvbm5lY3Rpbmcgd3Mgc2VydmVyIHRvIGh0dHAgc2VydmVyYClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7aG9zdCwgcG9ydH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzdGFydGluZyB3cyBzZXJ2ZXIgb24gJHtob3N0fToke3BvcnR9YClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFNlcnZlcihuZXcgV2ViU29ja2V0U2VydmVyKG9wdGlvbnMpKVxuICAgIH0sXG5cbiAgICBjcmVhdGUgKGNvbnRleHQgPSB7cGFyZW50OiB7dXJsfX0pIHtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dFxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH0sXG5cbiAgICBzZXQgY29udGV4dCAodmFsdWUpIHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNoYW5nZSBjb250ZXh0JylcbiAgICAgICAgY29udGV4dCA9IHZhbHVlXG4gICAgfSxcblxuICAgIGdldCBjb250ZXh0ICgpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHRcbiAgICB9XG59XG4iLCJpbXBvcnQgQnVzIGZyb20gJy4vQnVzJ1xuaW1wb3J0IHtzZXRDb25uZWN0aW9ufSBmcm9tICcuL0J1cydcbmltcG9ydCBDb25uZWN0aW9uIGZyb20gJy4vQ29ubmVjdGlvbidcbnNldENvbm5lY3Rpb24oQ29ubmVjdGlvbilcblxuZXhwb3J0IHtkZWZhdWx0IGFzIEJ1cyB9IGZyb20gJy4vQnVzJ1xuZXhwb3J0IHtkZWZhdWx0IGFzIENvbm5lY3Rpb259IGZyb20gJy4vQ29ubmVjdGlvbidcbmV4cG9ydCB7ZGVmYXVsdCBhcyBFdmVudEVtaXR0ZXJ9IGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuIl0sIm5hbWVzIjpbIkNvbm5lY3Rpb24iLCJtZXRob2RzIiwibWFuYWdlciIsIm5vZGUiLCJTZXJ2ZXIiLCJXZWJTb2NrZXQiLCJXZWJTb2NrZXRTZXJ2ZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU0sWUFBWSxDQUFDO0lBQ2YsV0FBVyxDQUFDLEdBQUc7UUFDWCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFO0tBQzFCO0lBQ0QsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtRQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDcEMsT0FBTyxJQUFJO0tBQ2Q7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQXFCRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUU7UUFDakIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2xDLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDekIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLO2dCQUNoQixLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNuQixPQUFPLElBQUk7U0FDZDtRQUNELE9BQU8sS0FBSztLQUNmO0NBQ0o7O0FBRUQsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEFBRTlEOztBQ3hDQSxJQUFhLEdBQUc7SUFBRSxFQUFFOztBQUVwQixNQUFNLE9BQU8sQ0FBQztJQUNWLFdBQVcsQ0FBQyxHQUFHO1FBQ1gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFB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

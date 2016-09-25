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

var ws = require('ws');

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

/*
 Copyright (C) 2016 Theatersoft

 This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3.

 This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with this program. If not, see <http://www.gnu.org/licenses/>

 */

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
    constructor (ws$$1) {
        super()
        this.ws = ws$$1
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
            .on('connection', ws$$1 => {
                console.log(`new connection to ${ws$$1.upgradeReq.headers.host}`)
                this.emit('connection', new Connection$2(ws$$1))
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
        return new Connection$2(new ws.WebSocket(parent.url))
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
        return new Server$1(new ws.Server(options))
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1idXMuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9FdmVudEVtaXR0ZXIuanMiLCIuLi9zcmMvTWFuYWdlci5qcyIsIi4uL3NyYy9ub2RlLmpzIiwiLi4vc3JjL0J1cy5qcyIsIi4uL3NyYy9Db25uZWN0aW9uLmpzIiwiLi4vc3JjL25vZGUtYnVuZGxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNsYXNzIEV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3IgKCkge1xuICAgICAgICB0aGlzLmV2ZW50cyA9IG5ldyBNYXAoKVxuICAgIH1cbiAgICBhZGRMaXN0ZW5lciAodHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5ldmVudHMuaGFzKHR5cGUpIHx8IHRoaXMuZXZlbnRzLnNldCh0eXBlLCBbXSlcbiAgICAgICAgdGhpcy5ldmVudHMuZ2V0KHR5cGUpLnB1c2goY2FsbGJhY2spXG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIC8vcmVtb3ZlTGlzdGVuZXIgKHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgLy8gICAgbGV0XG4gICAgLy8gICAgICAgIGV2ZW50cyA9IHRoaXMuZXZlbnRzLmdldCh0eXBlKSxcbiAgICAvLyAgICAgICAgaW5kZXhcbiAgICAvL1xuICAgIC8vICAgIGlmIChldmVudHMgJiYgZXZlbnRzLmxlbmd0aCkge1xuICAgIC8vICAgICAgICBpbmRleCA9IGV2ZW50cy5yZWR1Y2UoKGksIGV2ZW50LCBpbmRleCkgPT4ge1xuICAgIC8vICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgZXZlbnQgPT09ICdmdW5jdGlvbicgJiYgZXZlbnQgPT09IGNhbGxiYWNrKVxuICAgIC8vICAgICAgICAgICAgICAgID8gIGkgPSBpbmRleFxuICAgIC8vICAgICAgICAgICAgICAgIDogaVxuICAgIC8vICAgICAgICB9LCAtMSlcbiAgICAvL1xuICAgIC8vICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgIC8vICAgICAgICAgICAgZXZlbnRzLnNwbGljZShpbmRleCwgMSlcbiAgICAvLyAgICAgICAgICAgIHRoaXMuZXZlbnRzLnNldCh0eXBlLCBldmVudHMpXG4gICAgLy8gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIC8vICAgICAgICB9XG4gICAgLy8gICAgfVxuICAgIC8vICAgIHJldHVybiBmYWxzZVxuICAgIC8vfVxuICAgIGVtaXQgKHR5cGUsIC4uLmFyZ3MpIHtcbiAgICAgICAgbGV0IGV2ZW50cyA9IHRoaXMuZXZlbnRzLmdldCh0eXBlKVxuICAgICAgICBpZiAoZXZlbnRzICYmIGV2ZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGV2ZW50cy5mb3JFYWNoKGV2ZW50ID0+XG4gICAgICAgICAgICAgICAgZXZlbnQoLi4uYXJncykpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXJcblxuZXhwb3J0IGRlZmF1bHQgRXZlbnRFbWl0dGVyIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlcidcblxubGV0IG1hbmFnZXIsIGJ1cywgX2lcblxuY2xhc3MgTWFuYWdlciB7XG4gICAgY29uc3RydWN0b3IgKCkge1xuICAgICAgICB0aGlzLm5hbWVzID0gbmV3IE1hcCgpXG4gICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyIHN0YXJ0ZWQnKVxuICAgIH1cblxuICAgIGluaXQgKF9idXMsIF9pbXBsKSB7XG4gICAgICAgIGlmIChidXMpIHRocm93ICdyZWluaXRlZCdcbiAgICAgICAgYnVzID0gX2J1c1xuICAgICAgICBfaSA9IF9pbXBsXG4gICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyIGluaXQnKVxuICAgIH1cblxuICAgIC8vIFRPRE8gbmVlZHMgcmVxdWVzdCBtZXRhZGF0YTogc2VuZGVyXG4gICAgcmVxdWVzdE5hbWUgKG5hbWUsIG5vZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ01hbmFnZXIucmVxdWVzdE5hbWUnKVxuICAgIH1cblxuICAgIHJlbGVhc2VOYW1lIChuYW1lLCBub2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlbGVhc2VOYW1lJylcbiAgICB9XG5cbiAgICByZWdpc3RlciAobmFtZSwgb2JqKSB7XG4gICAgICAgIGlmIChfaS5ub2RlLnJvb3QpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlZ2lzdGVyIGFzIHJvb3QgJylcbiAgICAgICAgICAgIC8vYnVzLnJlZ2lzdGVyT2JqZWN0KG5hbWUsIG9iailcbiAgICAgICAgICAgIHRoaXMubmFtZXMuc2V0KG5hbWUsIG9iailcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSkgLy8gVE9ETyBCdXNPYmplY3RcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlZ2lzdGVyIGFzIGNoaWxkICcpXG4gICAgICAgICAgICByZXR1cm4gYnVzLnJlcXVlc3QoJy9CdXMucmVxdWVzdE5hbWUnLCBuYW1lLCBfaS5ub2RlLm5hbWUpLnRoZW4ociA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ01hbmFnZXIucmVnaXN0ZXJlZCAnKVxuICAgICAgICAgICAgICAgIHRoaXMubmFtZXMuc2V0KG5hbWUsIG9iailcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9jbGFzcyBCdXNFbWl0dGVyIHtcbi8vXG4vL31cbi8vXG4vL2NsYXNzIEJ1c09iamVjdCB7XG4vLyAgICBjb25zdHJ1Y3RvciAoYnVzKSB7XG4vLyAgICAgICAgdGhpcy5idXMgPSBidXNcbi8vICAgICAgICB0aGlzLl9lbWl0dGVyID0gbmV3IEJ1c0VtaXR0ZXIoKVxuLy8gICAgfVxuLy9cbi8vICAgIGdldCBlbWl0dGVyICgpIHtyZXR1cm4gdGhpcy5fZW1pdHRlcn1cbi8vfVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTWFuYWdlcigpIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlcidcbmltcG9ydCBtYW5hZ2VyIGZyb20gJy4vTWFuYWdlcidcblxuY29uc3RcbiAgICBub2RlID0ge1xuICAgICAgICAvL2J1cyxcbiAgICAgICAgLy9uYW1lLFxuICAgICAgICAvL3NlcnZlcixcbiAgICAgICAgY29ubmVjdGlvbnM6IFt1bmRlZmluZWRdLFxuICAgICAgICBvYmplY3RzOiB7fSxcbiAgICAgICAgcmVxaWQ6IDAsXG4gICAgICAgIHJlcXVlc3RzOiB7fSxcbiAgICAgICAgc2lnbmFsczogbmV3IEV2ZW50RW1pdHRlcigpXG4gICAgfSxcbiAgICBhZGRDaGlsZCA9IGNoaWxkID0+IHtcbiAgICAgICAgY2hpbGQuaWQgPSBub2RlLmNvbm5lY3Rpb25zLmxlbmd0aFxuICAgICAgICBjaGlsZC5uYW1lID0gYCR7bm9kZS5uYW1lfSR7Y2hpbGQuaWR9YFxuICAgICAgICBjb25zb2xlLmxvZyhgJHtub2RlLm5hbWV9IGFkZGluZyBjaGlsZCAke2NoaWxkLm5hbWV9YClcbiAgICAgICAgbm9kZS5jb25uZWN0aW9ucy5wdXNoKGNoaWxkKVxuICAgICAgICBjaGlsZC5zZW5kKHtoZWxsbzogYCR7Y2hpbGQubmFtZX0vYH0pXG4gICAgfSxcbiAgICBzdGFydFNlcnZlciA9IGNvbnRleHQgPT4ge1xuICAgICAgICBpZiAoY29udGV4dC5jaGlsZHJlbikge1xuICAgICAgICAgICAgbm9kZS5zZXJ2ZXIgPSBDb25uZWN0aW9uLmNyZWF0ZVNlcnZlcihjb250ZXh0LmNoaWxkcmVuKVxuICAgICAgICAgICAgICAgIC5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBhZGRDaGlsZChiaW5kKGNvbm5lY3Rpb24pKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXJ2ZXIgZXJyb3InLCBlcnIpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcm91dGUgPSBuID0+IHtcbiAgICAgICAgbGV0IGkgPSBuLmxhc3RJbmRleE9mKCcvJylcbiAgICAgICAgaWYgKGkgPT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbmFtZScpXG4gICAgICAgIGxldFxuICAgICAgICAgICAgcGF0aCA9IG4uc2xpY2UoMCwgaSArIDEpLFxuICAgICAgICAgICAgciA9IHBhdGggPT09IG5vZGUubmFtZSA/IG51bGxcbiAgICAgICAgICAgICAgICA6IHBhdGguc3RhcnRzV2l0aCgobm9kZS5uYW1lKSkgPyBub2RlLmNvbm5lY3Rpb25zW3BhcnNlSW50KHBhdGguc2xpY2Uobm9kZS5uYW1lLmxlbmd0aCkpXVxuICAgICAgICAgICAgICAgIDogbm9kZS5jb25uZWN0aW9uc1swXVxuICAgICAgICAvL2NvbnNvbGUubG9nKGByb3V0aW5nIHRvICR7cGF0aH0gZnJvbSAke25vZGUubmFtZX0gcmV0dXJucyAke3IgJiYgci5uYW1lfWApXG4gICAgICAgIHJldHVybiByXG4gICAgfSxcbiAgICBiaW5kID0gY29ubiA9PiB7XG4gICAgICAgIHJldHVybiBjb25uXG4gICAgICAgICAgICAub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGBkYXRhIGZyb20gJHtjb25uLm5hbWV9YCwgZGF0YSlcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdChkYXRhLnJlcSkudGhlbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGx5KHtpZDogZGF0YS5yZXEuaWQsIHBhdGg6IGRhdGEucmVxLnNlbmRlciwgYXJnczogcmVzfSksXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpKVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5yZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVwbHkoZGF0YS5yZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnNpZykge1xuICAgICAgICAgICAgICAgICAgICBzaWduYWwoZGF0YS5zaWcsIGNvbm4uaWQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGNvbm5lY3Rpb24gY2xvc2UgJHtjb25uLm5hbWV9YClcbiAgICAgICAgICAgICAgICBub2RlLmNvbm5lY3Rpb25zW2Nvbm4uaWRdID0gdW5kZWZpbmVkXG4gICAgICAgICAgICB9KVxuICAgIH0sXG4gICAgcmVxdWVzdCA9IHJlcSA9PiB7XG4gICAgICAgIGxldCBjb25uID0gcm91dGUocmVxLnBhdGgpXG4gICAgICAgIGlmIChjb25uKSB7XG4gICAgICAgICAgICBpZiAocmVxLnNlbmRlcilcbiAgICAgICAgICAgICAgICBjb25uLnNlbmQoe3JlcX0pXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXEuc2VuZGVyID0gbm9kZS5uYW1lXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyLCBqKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5pZCA9IG5vZGUucmVxaWQrK1xuICAgICAgICAgICAgICAgICAgICBjb25uLnNlbmQoe3JlcX0pXG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVxdWVzdHNbcmVxLmlkXSA9IHtyLCBqLCByZXF9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjb25uID09PSBudWxsKSB7XG4gICAgICAgICAgICBsZXQgb2JqID0gbm9kZS5vYmplY3RzW3JlcS5pbnRlcmZhY2VdICYmIG5vZGUub2JqZWN0c1tyZXEuaW50ZXJmYWNlXS5vYmpcbiAgICAgICAgICAgIGlmICghb2JqKSByZXR1cm4gUHJvbWlzZS5yZWplY3QoYEVycm9yIGludGVyZmFjZSAke3JlcS5pbnRlcmZhY2V9IG9iamVjdCBub3QgZm91bmRgKVxuICAgICAgICAgICAgbGV0IG1lbWJlciA9IG9ialtyZXEubWVtYmVyXSwgYXJncyA9IHJlcS5hcmdzIC8vIHdvcmthcm91bmQgdWdsaWZ5IHBhcnNlIGVycm9yXG4gICAgICAgICAgICBpZiAoIW1lbWJlcikgcmV0dXJuIFByb21pc2UucmVqZWN0KGBFcnJvciBtZW1iZXIgJHtyZXEubWVtYmVyfSBub3QgZm91bmRgKVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG9ialtyZXEubWVtYmVyXSguLi5hcmdzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGBFeGNlcHRpb24gY2FsbGluZyBpbnRlcmZhY2UgJHtyZXEuaW50ZXJmYWNlfSBvYmplY3QgbWVtYmVyICR7cmVxLm1lbWJlcn0gJHtlfWApXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY29ubiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdjb25uZWN0aW9uIGVycm9yJykgLy8gVE9ET1xuICAgIH0sXG4gICAgcmVwbHkgPSByZXMgPT4ge1xuICAgICAgICBsZXQgY29ubiA9IHJvdXRlKHJlcy5wYXRoKVxuICAgICAgICBpZiAoY29ubilcbiAgICAgICAgICAgIGNvbm4uc2VuZCh7cmVzfSlcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgciA9IG5vZGUucmVxdWVzdHNbcmVzLmlkXVxuICAgICAgICAgICAgZGVsZXRlIG5vZGUucmVxdWVzdHNbcmVzLmlkXVxuICAgICAgICAgICAgci5yKHJlcy5hcmdzKVxuICAgICAgICB9XG4gICAgfSxcbiAgICBzaWdyb3V0ZSA9IChuYW1lLCBmcm9tKSA9PiB7XG4gICAgICAgIGxldCByID0gbm9kZS5jb25uZWN0aW9ucy5maWx0ZXIoYyA9PiBjICYmIGMuaWQgIT09IGZyb20pXG4gICAgICAgIC8vY29uc29sZS5sb2coYHNpZ3JvdXRpbmcgJHtuYW1lfSBmcm9tICR7ZnJvbX0gcmV0dXJucyAke3IubWFwKGMgPT4gYy5pZCl9YClcbiAgICAgICAgcmV0dXJuIHJcbiAgICB9LFxuICAgIHNpZ25hbCA9IChzaWcsIGZyb20pID0+IHtcbiAgICAgICAgbm9kZS5zaWduYWxzLmVtaXQoc2lnLm5hbWUsIHNpZy5hcmdzKVxuICAgICAgICBzaWdyb3V0ZShzaWcubmFtZSwgZnJvbSkuZm9yRWFjaChjID0+IGMgJiYgYy5zZW5kKHtzaWd9KSlcbiAgICB9LFxuICAgIG1ldGhvZHMgPSBvYmogPT4ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iaikpXG4gICAgICAgICAgICAuZmlsdGVyKHAgPT5cbiAgICAgICAgICAgIHR5cGVvZiBvYmpbcF0gPT09ICdmdW5jdGlvbicgJiYgcCAhPT0gJ2NvbnN0cnVjdG9yJylcbiAgICB9LFxuICAgIGNsb3NlID0gKCkgPT4ge1xuICAgIH0sXG4gICAgaW5pdE1hbmFnZXIgPSBidXMgPT4gbWFuYWdlci5pbml0KGJ1cywge1xuICAgICAgICBub2RlLCByZXF1ZXN0LCBzaWduYWwsIC8vIFRPRE9cbiAgICB9KVxuXG52YXIgQ29ubmVjdGlvblxuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgZ2V0IGJ1cyAoKSB7cmV0dXJuIG5vZGUuYnVzfSxcbiAgICBzZXQgYnVzIChiKSB7bm9kZS5idXMgPSBifSxcblxuICAgIHNldCBDb25uZWN0aW9uIChjKSB7Q29ubmVjdGlvbiA9IGN9LFxuXG4gICAgY29ubmVjdGlvbnM6IG5vZGUuY29ubmVjdGlvbnMsXG5cbiAgICBnZXQgbmFtZSAoKSB7cmV0dXJuIG5vZGUubmFtZX0sXG4gICAgc2V0IG5hbWUgKG4pIHtub2RlLm5hbWUgPSBufSxcblxuICAgIG9iamVjdHM6IG5vZGUub2JqZWN0cyxcbiAgICBzaWduYWxzOiBub2RlLnNpZ25hbHMsXG5cbiAgICBhZGRDaGlsZCxcbiAgICBzdGFydFNlcnZlcixcbiAgICByb3V0ZSxcbiAgICBiaW5kLFxuICAgIHJlcXVlc3QsXG4gICAgcmVwbHksXG4gICAgc2lncm91dGUsXG4gICAgc2lnbmFsLFxuICAgIGNsb3NlLFxuICAgIGluaXRNYW5hZ2VyXG59IiwiLypcbiBDb3B5cmlnaHQgKEMpIDIwMTYgVGhlYXRlcnNvZnRcblxuIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEFmZmVybyBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCB2ZXJzaW9uIDMuXG5cbiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBBZmZlcm8gR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuXG4gWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEFmZmVybyBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLiBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz5cblxuICovXG5cbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5pbXBvcnQgbm9kZSBmcm9tICcuL25vZGUnXG5cbmNvbnN0IEV4ZWN1dG9yID0gKF9yLCBfaikgPT4gKHtcbiAgICBwcm9taXNlOiBuZXcgUHJvbWlzZSgociwgaikgPT4ge19yID0gcjsgX2ogPSBqfSksXG4gICAgcmVzb2x2ZTogdiA9PiBfcih2KSxcbiAgICByZWplY3Q6IGUgPT4gX2ooZSlcbn0pXG5sZXQgYnVzRXhlY3V0b3IgPSBFeGVjdXRvcigpXG5cbmNsYXNzIEJ1cyBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgc3RhdGljIHN0YXJ0ICgpIHtcbiAgICAgICAgaWYgKENvbm5lY3Rpb24gJiYgIW5vZGUuYnVzKSB7XG4gICAgICAgICAgICBsZXQgYnVzID0gbmV3IEJ1cyhDb25uZWN0aW9uLmNvbnRleHQpXG4gICAgICAgICAgICAgICAgLm9uKCdjb25uZWN0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmJ1cyA9IGJ1c1xuICAgICAgICAgICAgICAgICAgICBidXNFeGVjdXRvci5yZXNvbHZlKGJ1cylcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBidXNFeGVjdXRvci5wcm9taXNlXG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IgKGNvbnRleHQpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICBpZiAoIWNvbnRleHQpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBidXMgY29udGV4dCcpXG4gICAgICAgIGlmIChjb250ZXh0LnBhcmVudCkge1xuICAgICAgICAgICAgbGV0IGNvbm4gPSBub2RlLmJpbmQoQ29ubmVjdGlvbi5jcmVhdGVQYXJlbnRDb25uZWN0aW9uKGNvbnRleHQucGFyZW50KVxuICAgICAgICAgICAgICAgIC5vbignb3BlbicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcmVudCBvcGVuJylcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5oZWxsbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGJ1cyBuYW1lIGlzICR7ZGF0YS5oZWxsb31gKVxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gZGF0YS5oZWxsb1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubi5uYW1lID0gYCR7bm9kZS5uYW1lfTBgXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmluaXRNYW5hZ2VyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc3RhcnRTZXJ2ZXIoY29udGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGFyZW50IGVycm9yJywgZXJyKVxuICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgY29ubi5pZCA9IDBcbiAgICAgICAgICAgIG5vZGUuY29ubmVjdGlvbnNbMF0gPSBjb25uXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub2RlLnJvb3QgPSB0cnVlXG4gICAgICAgICAgICBub2RlLm5hbWUgPSAnLydcbiAgICAgICAgICAgIG5vZGUuaW5pdE1hbmFnZXIoKVxuICAgICAgICAgICAgbm9kZS5zdGFydFNlcnZlcihjb250ZXh0KVxuICAgICAgICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IHRoaXMuZW1pdCgnY29ubmVjdCcpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IG5hbWUgKCkge1xuICAgICAgICByZXR1cm4gbm9kZS5uYW1lXG4gICAgfVxuXG4gICAgcmVnaXN0ZXJPYmplY3QgKG5hbWUsIG9iaiwgaWZhY2UgPSAobWV0aG9kcyhvYmopKSkge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVnaXN0ZXJPYmplY3QgJHtuYW1lfSBhdCAke25vZGUubmFtZX0gaW50ZXJmYWNlYCwgaWZhY2UpXG4gICAgICAgIG5vZGUub2JqZWN0c1tuYW1lXSA9IHtvYmosIGlmYWNlfVxuICAgIH1cblxuICAgIHVucmVnaXN0ZXJPYmplY3QgKCkge1xuICAgICAgICAvL1RPRE9cbiAgICB9XG5cbiAgICByZXF1ZXN0IChuYW1lLCAuLi5hcmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXF1ZXN0JywgbmFtZSwgYXJncylcbiAgICAgICAgY29uc3QgWywgcGF0aCwgaWZhY2UsIG1lbWJlcl0gPSAvXihbL1xcZF0rKShcXHcrKS4oXFx3KykkLy5leGVjKG5hbWUpXG4gICAgICAgIHJldHVybiBub2RlLnJlcXVlc3Qoe3BhdGgsIGludGVyZmFjZTogaWZhY2UsIG1lbWJlciwgYXJnc30pXG4gICAgICAgICAgICAuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHJlcXVlc3QgJHtuYW1lfSByZWplY3RlZCAke2V9YClcbiAgICAgICAgICAgICAgICB0aHJvdyBlXG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHNpZ25hbCAobmFtZSwgYXJncykge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdzaWduYWwnLCBuYW1lLCBhcmdzKVxuICAgICAgICBjb25zdCBbLCBwYXRoLCBpZmFjZSwgbWVtYmVyXSA9IC9eKFsvXFxkXSspKFxcdyspLihcXHcrKSQvLmV4ZWMobmFtZSlcbiAgICAgICAgcmV0dXJuIG5vZGUuc2lnbmFsKHtuYW1lLCBwYXRoLCBpbnRlcmZhY2U6IGlmYWNlLCBtZW1iZXIsIGFyZ3N9KVxuICAgIH1cblxuICAgIHJlZ2lzdGVyTGlzdGVuZXIgKG5hbWUsIGNiKSB7XG4gICAgICAgIC8vY29uc3QgWywgcGF0aCwgaWZhY2UsIG1lbWJlcl0gPSAvXihbL1xcZF0rKShcXHcrKS4oXFx3KykkLy5leGVjKG5hbWUpXG4gICAgICAgIC8vVE9ET1xuICAgICAgICBub2RlLnNpZ25hbHMub24obmFtZSwgY2IpXG4gICAgfVxuXG4gICAgdW5yZWdpc3Rlckxpc3RlbmVyICgpIHtcbiAgICAgICAgLy9UT0RPXG4gICAgfVxuXG4gICAgY2xvc2UgKCkge1xuICAgICAgICBub2RlLmNsb3NlXG4gICAgfVxufVxuXG5sZXQgQ29ubmVjdGlvbiAvL3NldENvbm5lY3Rpb25cblxuZXhwb3J0IGZ1bmN0aW9uIHNldENvbm5lY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKENvbm5lY3Rpb24pIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNoYW5nZSBDb25uZWN0aW9uJylcbiAgICBDb25uZWN0aW9uID0gbm9kZS5Db25uZWN0aW9uID0gdmFsdWVcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIHN0YXJ0IChjb250ZXh0KSB7XG4gICAgICAgIENvbm5lY3Rpb24uY3JlYXRlKGNvbnRleHQpXG4gICAgICAgIHJldHVybiBCdXMuc3RhcnQoKVxuICAgIH0sXG4gICAgZ2V0IGJ1cyAoKSB7XG4gICAgICAgIGlmICghbm9kZS5idXMpIHRocm93IG5ldyBFcnJvcignQnVzIG5vdCBzdGFydGVkJylcbiAgICAgICAgcmV0dXJuIG5vZGUuYnVzXG4gICAgfSxcbiAgICBwcm94eSAoaWZhY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICAgICAgZ2V0IChfLCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICguLi5hcmdzKSA9PlxuICAgICAgICAgICAgICAgICAgICBub2RlLnJlcXVlc3Qoe3BhdGg6ICcvJywgaW50ZXJmYWNlOiBpZmFjZSwgbWVtYmVyOiBuYW1lLCBhcmdzfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJpbXBvcnQge1dlYlNvY2tldCwgU2VydmVyIGFzIFdlYlNvY2tldFNlcnZlcn0gZnJvbSAnd3MnXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuQlVTIHx8ICd3czovL2xvY2FsaG9zdDo1NDUzJ1xuXG5jbGFzcyBDb25uZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvciAod3MpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICB0aGlzLndzID0gd3NcbiAgICAgICAgICAgIC5vbignb3BlbicsICgpID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdvcGVuJykpXG4gICAgICAgICAgICAub24oJ21lc3NhZ2UnLCAoZGF0YSwgZmxhZ3MpID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdkYXRhJywgSlNPTi5wYXJzZShkYXRhKSkpXG4gICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nsb3NlJykpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycikpXG4gICAgfVxuXG4gICAgc2VuZCAoZGF0YSkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGBjb25uZWN0aW9uICR7dGhpcy5uYW1lfSBzZW5kYCwgZGF0YSlcbiAgICAgICAgdGhpcy53cy5zZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKVxuICAgIH1cbn1cblxuY2xhc3MgU2VydmVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvciAod3NzKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgd3NzXG4gICAgICAgICAgICAub24oJ2Nvbm5lY3Rpb24nLCB3cyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYG5ldyBjb25uZWN0aW9uIHRvICR7d3MudXBncmFkZVJlcS5oZWFkZXJzLmhvc3R9YClcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCBuZXcgQ29ubmVjdGlvbih3cykpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdjbG9zZScsIChjb2RlLCBtc2cpID0+XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdjbG9zZScpKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PlxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpKVxuICAgIH1cbn1cblxubGV0IGNvbnRleHRcblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGNyZWF0ZVBhcmVudENvbm5lY3Rpb24gKHBhcmVudCkge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX1RMU19SRUpFQ1RfVU5BVVRIT1JJWkVEID0gJzAnXG4gICAgICAgIHJldHVybiBuZXcgQ29ubmVjdGlvbihuZXcgV2ViU29ja2V0KHBhcmVudC51cmwpKVxuICAgIH0sXG5cbiAgICBjcmVhdGVTZXJ2ZXIgKHtob3N0LCBwb3J0LCBzZXJ2ZXJ9KSB7XG4gICAgICAgIGxldCBvcHRpb25zXG4gICAgICAgIGlmIChzZXJ2ZXIpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7c2VydmVyfVxuICAgICAgICAgICAgY29uc29sZS5sb2coYGNvbm5lY3Rpbmcgd3Mgc2VydmVyIHRvIGh0dHAgc2VydmVyYClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7aG9zdCwgcG9ydH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzdGFydGluZyB3cyBzZXJ2ZXIgb24gJHtob3N0fToke3BvcnR9YClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFNlcnZlcihuZXcgV2ViU29ja2V0U2VydmVyKG9wdGlvbnMpKVxuICAgIH0sXG5cbiAgICBjcmVhdGUgKGNvbnRleHQgPSB7cGFyZW50OiB7dXJsfX0pIHtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dFxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH0sXG5cbiAgICBzZXQgY29udGV4dCAodmFsdWUpIHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNoYW5nZSBjb250ZXh0JylcbiAgICAgICAgY29udGV4dCA9IHZhbHVlXG4gICAgfSxcblxuICAgIGdldCBjb250ZXh0ICgpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHRcbiAgICB9XG59XG4iLCJpbXBvcnQgQnVzIGZyb20gJy4vQnVzJ1xuaW1wb3J0IHtzZXRDb25uZWN0aW9ufSBmcm9tICcuL0J1cydcbmltcG9ydCBDb25uZWN0aW9uIGZyb20gJy4vQ29ubmVjdGlvbidcbnNldENvbm5lY3Rpb24oQ29ubmVjdGlvbilcblxuZXhwb3J0IHtkZWZhdWx0IGFzIEJ1cyB9IGZyb20gJy4vQnVzJ1xuZXhwb3J0IHtkZWZhdWx0IGFzIENvbm5lY3Rpb259IGZyb20gJy4vQ29ubmVjdGlvbidcbmV4cG9ydCB7ZGVmYXVsdCBhcyBFdmVudEVtaXR0ZXJ9IGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuIl0sIm5hbWVzIjpbIkNvbm5lY3Rpb24iLCJtZXRob2RzIiwibWFuYWdlciIsIm5vZGUiLCJ3cyIsIlNlcnZlciIsIldlYlNvY2tldCIsIldlYlNvY2tldFNlcnZlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTSxZQUFZLENBQUM7SUFDZixXQUFXLENBQUMsR0FBRztRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUU7S0FDMUI7SUFDRCxXQUFXLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1FBQ3pCLElBQUksQ0FBQyxNQUFNLENB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

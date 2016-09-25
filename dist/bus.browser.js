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
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.bus = global.bus || {})));
}(this, (function (exports) { 'use strict';

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

class Connection$2 extends EventEmitter {
    constructor (ws) {
        super()
        this.ws = ws
        const self = this
        ws.onopen = () =>
            self.emit('open')
        ws.onmessage = ev =>
            self.emit('data', JSON.parse(ev.data))
        ws.onclose = ev => {
            console.log('connection close', this.name)
            self.emit('close')
        }
        ws.onerror = ev =>
            self.emit('error', ev)
    }
    send (data) {
        console.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

let context

var Connection$3 = {
    createParentConnection (parent) {
        return new Connection$2(new WebSocket(parent.url))
    },
    createServer ({host, port, server}) {
        throw ('not implemented')
    },
    create (context) {
        this.context = context
        return this
    },
    set context (value) {
        if (context) throw new Error('Cannot change context')
        context = value
    },
    get context () {
        return context || {parent: {url: `${location.protocol ==='https:' ? 'wss' : 'ws'}://${location.host}`}}
    }
}

setConnection(Connection$3)

exports.Bus = Bus$1;
exports.Connection = Connection$3;
exports.EventEmitter = EventEmitter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVzLmJyb3dzZXIuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9FdmVudEVtaXR0ZXIuanMiLCIuLi9zcmMvTWFuYWdlci5qcyIsIi4uL3NyYy9ub2RlLmpzIiwiLi4vc3JjL0J1cy5qcyIsIi4uL3NyYy9Ccm93c2VyQ29ubmVjdGlvbi5qcyIsIi4uL3NyYy9idW5kbGUuYnJvd3Nlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy5ldmVudHMgPSBuZXcgTWFwKClcbiAgICB9XG4gICAgYWRkTGlzdGVuZXIgKHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzLmhhcyh0eXBlKSB8fCB0aGlzLmV2ZW50cy5zZXQodHlwZSwgW10pXG4gICAgICAgIHRoaXMuZXZlbnRzLmdldCh0eXBlKS5wdXNoKGNhbGxiYWNrKVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgICAvL3JlbW92ZUxpc3RlbmVyICh0eXBlLCBjYWxsYmFjaykge1xuICAgIC8vICAgIGxldFxuICAgIC8vICAgICAgICBldmVudHMgPSB0aGlzLmV2ZW50cy5nZXQodHlwZSksXG4gICAgLy8gICAgICAgIGluZGV4XG4gICAgLy9cbiAgICAvLyAgICBpZiAoZXZlbnRzICYmIGV2ZW50cy5sZW5ndGgpIHtcbiAgICAvLyAgICAgICAgaW5kZXggPSBldmVudHMucmVkdWNlKChpLCBldmVudCwgaW5kZXgpID0+IHtcbiAgICAvLyAgICAgICAgICAgIHJldHVybiAodHlwZW9mIGV2ZW50ID09PSAnZnVuY3Rpb24nICYmIGV2ZW50ID09PSBjYWxsYmFjaylcbiAgICAvLyAgICAgICAgICAgICAgICA/ICBpID0gaW5kZXhcbiAgICAvLyAgICAgICAgICAgICAgICA6IGlcbiAgICAvLyAgICAgICAgfSwgLTEpXG4gICAgLy9cbiAgICAvLyAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAvLyAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgLy8gICAgICAgICAgICB0aGlzLmV2ZW50cy5zZXQodHlwZSwgZXZlbnRzKVxuICAgIC8vICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAvLyAgICAgICAgfVxuICAgIC8vICAgIH1cbiAgICAvLyAgICByZXR1cm4gZmFsc2VcbiAgICAvL31cbiAgICBlbWl0ICh0eXBlLCAuLi5hcmdzKSB7XG4gICAgICAgIGxldCBldmVudHMgPSB0aGlzLmV2ZW50cy5nZXQodHlwZSlcbiAgICAgICAgaWYgKGV2ZW50cyAmJiBldmVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBldmVudHMuZm9yRWFjaChldmVudCA9PlxuICAgICAgICAgICAgICAgIGV2ZW50KC4uLmFyZ3MpKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyXG5cbmV4cG9ydCBkZWZhdWx0IEV2ZW50RW1pdHRlciIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5cbmxldCBtYW5hZ2VyLCBidXMsIF9pXG5cbmNsYXNzIE1hbmFnZXIge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy5uYW1lcyA9IG5ldyBNYXAoKVxuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlciBzdGFydGVkJylcbiAgICB9XG5cbiAgICBpbml0IChfYnVzLCBfaW1wbCkge1xuICAgICAgICBpZiAoYnVzKSB0aHJvdyAncmVpbml0ZWQnXG4gICAgICAgIGJ1cyA9IF9idXNcbiAgICAgICAgX2kgPSBfaW1wbFxuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlciBpbml0JylcbiAgICB9XG5cbiAgICAvLyBUT0RPIG5lZWRzIHJlcXVlc3QgbWV0YWRhdGE6IHNlbmRlclxuICAgIHJlcXVlc3ROYW1lIChuYW1lLCBub2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlcXVlc3ROYW1lJylcbiAgICB9XG5cbiAgICByZWxlYXNlTmFtZSAobmFtZSwgbm9kZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWxlYXNlTmFtZScpXG4gICAgfVxuXG4gICAgcmVnaXN0ZXIgKG5hbWUsIG9iaikge1xuICAgICAgICBpZiAoX2kubm9kZS5yb290KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWdpc3RlciBhcyByb290ICcpXG4gICAgICAgICAgICAvL2J1cy5yZWdpc3Rlck9iamVjdChuYW1lLCBvYmopXG4gICAgICAgICAgICB0aGlzLm5hbWVzLnNldChuYW1lLCBvYmopXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpIC8vIFRPRE8gQnVzT2JqZWN0XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWdpc3RlciBhcyBjaGlsZCAnKVxuICAgICAgICAgICAgcmV0dXJuIGJ1cy5yZXF1ZXN0KCcvQnVzLnJlcXVlc3ROYW1lJywgbmFtZSwgX2kubm9kZS5uYW1lKS50aGVuKHIgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlZ2lzdGVyZWQgJylcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWVzLnNldChuYW1lLCBvYmopXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vY2xhc3MgQnVzRW1pdHRlciB7XG4vL1xuLy99XG4vL1xuLy9jbGFzcyBCdXNPYmplY3Qge1xuLy8gICAgY29uc3RydWN0b3IgKGJ1cykge1xuLy8gICAgICAgIHRoaXMuYnVzID0gYnVzXG4vLyAgICAgICAgdGhpcy5fZW1pdHRlciA9IG5ldyBCdXNFbWl0dGVyKClcbi8vICAgIH1cbi8vXG4vLyAgICBnZXQgZW1pdHRlciAoKSB7cmV0dXJuIHRoaXMuX2VtaXR0ZXJ9XG4vL31cblxuZXhwb3J0IGRlZmF1bHQgbmV3IE1hbmFnZXIoKSIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5pbXBvcnQgbWFuYWdlciBmcm9tICcuL01hbmFnZXInXG5cbmNvbnN0XG4gICAgbm9kZSA9IHtcbiAgICAgICAgLy9idXMsXG4gICAgICAgIC8vbmFtZSxcbiAgICAgICAgLy9zZXJ2ZXIsXG4gICAgICAgIGNvbm5lY3Rpb25zOiBbdW5kZWZpbmVkXSxcbiAgICAgICAgb2JqZWN0czoge30sXG4gICAgICAgIHJlcWlkOiAwLFxuICAgICAgICByZXF1ZXN0czoge30sXG4gICAgICAgIHNpZ25hbHM6IG5ldyBFdmVudEVtaXR0ZXIoKVxuICAgIH0sXG4gICAgYWRkQ2hpbGQgPSBjaGlsZCA9PiB7XG4gICAgICAgIGNoaWxkLmlkID0gbm9kZS5jb25uZWN0aW9ucy5sZW5ndGhcbiAgICAgICAgY2hpbGQubmFtZSA9IGAke25vZGUubmFtZX0ke2NoaWxkLmlkfWBcbiAgICAgICAgY29uc29sZS5sb2coYCR7bm9kZS5uYW1lfSBhZGRpbmcgY2hpbGQgJHtjaGlsZC5uYW1lfWApXG4gICAgICAgIG5vZGUuY29ubmVjdGlvbnMucHVzaChjaGlsZClcbiAgICAgICAgY2hpbGQuc2VuZCh7aGVsbG86IGAke2NoaWxkLm5hbWV9L2B9KVxuICAgIH0sXG4gICAgc3RhcnRTZXJ2ZXIgPSBjb250ZXh0ID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIG5vZGUuc2VydmVyID0gQ29ubmVjdGlvbi5jcmVhdGVTZXJ2ZXIoY29udGV4dC5jaGlsZHJlbilcbiAgICAgICAgICAgICAgICAub24oJ2Nvbm5lY3Rpb24nLCBjb25uZWN0aW9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2hpbGQoYmluZChjb25uZWN0aW9uKSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2VydmVyIGVycm9yJywgZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJvdXRlID0gbiA9PiB7XG4gICAgICAgIGxldCBpID0gbi5sYXN0SW5kZXhPZignLycpXG4gICAgICAgIGlmIChpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG5hbWUnKVxuICAgICAgICBsZXRcbiAgICAgICAgICAgIHBhdGggPSBuLnNsaWNlKDAsIGkgKyAxKSxcbiAgICAgICAgICAgIHIgPSBwYXRoID09PSBub2RlLm5hbWUgPyBudWxsXG4gICAgICAgICAgICAgICAgOiBwYXRoLnN0YXJ0c1dpdGgoKG5vZGUubmFtZSkpID8gbm9kZS5jb25uZWN0aW9uc1twYXJzZUludChwYXRoLnNsaWNlKG5vZGUubmFtZS5sZW5ndGgpKV1cbiAgICAgICAgICAgICAgICA6IG5vZGUuY29ubmVjdGlvbnNbMF1cbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcm91dGluZyB0byAke3BhdGh9IGZyb20gJHtub2RlLm5hbWV9IHJldHVybnMgJHtyICYmIHIubmFtZX1gKVxuICAgICAgICByZXR1cm4gclxuICAgIH0sXG4gICAgYmluZCA9IGNvbm4gPT4ge1xuICAgICAgICByZXR1cm4gY29ublxuICAgICAgICAgICAgLm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgZGF0YSBmcm9tICR7Y29ubi5uYW1lfWAsIGRhdGEpXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoZGF0YS5yZXEpLnRoZW4oXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBseSh7aWQ6IGRhdGEucmVxLmlkLCBwYXRoOiBkYXRhLnJlcS5zZW5kZXIsIGFyZ3M6IHJlc30pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEucmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcGx5KGRhdGEucmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgc2lnbmFsKGRhdGEuc2lnLCBjb25uLmlkKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjb25uZWN0aW9uIGNsb3NlICR7Y29ubi5uYW1lfWApXG4gICAgICAgICAgICAgICAgbm9kZS5jb25uZWN0aW9uc1tjb25uLmlkXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgfSlcbiAgICB9LFxuICAgIHJlcXVlc3QgPSByZXEgPT4ge1xuICAgICAgICBsZXQgY29ubiA9IHJvdXRlKHJlcS5wYXRoKVxuICAgICAgICBpZiAoY29ubikge1xuICAgICAgICAgICAgaWYgKHJlcS5zZW5kZXIpXG4gICAgICAgICAgICAgICAgY29ubi5zZW5kKHtyZXF9KVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNlbmRlciA9IG5vZGUubmFtZVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgociwgaikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXEuaWQgPSBub2RlLnJlcWlkKytcbiAgICAgICAgICAgICAgICAgICAgY29ubi5zZW5kKHtyZXF9KVxuICAgICAgICAgICAgICAgICAgICBub2RlLnJlcXVlc3RzW3JlcS5pZF0gPSB7ciwgaiwgcmVxfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29ubiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbGV0IG9iaiA9IG5vZGUub2JqZWN0c1tyZXEuaW50ZXJmYWNlXSAmJiBub2RlLm9iamVjdHNbcmVxLmludGVyZmFjZV0ub2JqXG4gICAgICAgICAgICBpZiAoIW9iaikgcmV0dXJuIFByb21pc2UucmVqZWN0KGBFcnJvciBpbnRlcmZhY2UgJHtyZXEuaW50ZXJmYWNlfSBvYmplY3Qgbm90IGZvdW5kYClcbiAgICAgICAgICAgIGxldCBtZW1iZXIgPSBvYmpbcmVxLm1lbWJlcl0sIGFyZ3MgPSByZXEuYXJncyAvLyB3b3JrYXJvdW5kIHVnbGlmeSBwYXJzZSBlcnJvclxuICAgICAgICAgICAgaWYgKCFtZW1iZXIpIHJldHVybiBQcm9taXNlLnJlamVjdChgRXJyb3IgbWVtYmVyICR7cmVxLm1lbWJlcn0gbm90IGZvdW5kYClcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShvYmpbcmVxLm1lbWJlcl0oLi4uYXJncykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChgRXhjZXB0aW9uIGNhbGxpbmcgaW50ZXJmYWNlICR7cmVxLmludGVyZmFjZX0gb2JqZWN0IG1lbWJlciAke3JlcS5tZW1iZXJ9ICR7ZX1gKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbm4gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnY29ubmVjdGlvbiBlcnJvcicpIC8vIFRPRE9cbiAgICB9LFxuICAgIHJlcGx5ID0gcmVzID0+IHtcbiAgICAgICAgbGV0IGNvbm4gPSByb3V0ZShyZXMucGF0aClcbiAgICAgICAgaWYgKGNvbm4pXG4gICAgICAgICAgICBjb25uLnNlbmQoe3Jlc30pXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IHIgPSBub2RlLnJlcXVlc3RzW3Jlcy5pZF1cbiAgICAgICAgICAgIGRlbGV0ZSBub2RlLnJlcXVlc3RzW3Jlcy5pZF1cbiAgICAgICAgICAgIHIucihyZXMuYXJncylcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2lncm91dGUgPSAobmFtZSwgZnJvbSkgPT4ge1xuICAgICAgICBsZXQgciA9IG5vZGUuY29ubmVjdGlvbnMuZmlsdGVyKGMgPT4gYyAmJiBjLmlkICE9PSBmcm9tKVxuICAgICAgICAvL2NvbnNvbGUubG9nKGBzaWdyb3V0aW5nICR7bmFtZX0gZnJvbSAke2Zyb219IHJldHVybnMgJHtyLm1hcChjID0+IGMuaWQpfWApXG4gICAgICAgIHJldHVybiByXG4gICAgfSxcbiAgICBzaWduYWwgPSAoc2lnLCBmcm9tKSA9PiB7XG4gICAgICAgIG5vZGUuc2lnbmFscy5lbWl0KHNpZy5uYW1lLCBzaWcuYXJncylcbiAgICAgICAgc2lncm91dGUoc2lnLm5hbWUsIGZyb20pLmZvckVhY2goYyA9PiBjICYmIGMuc2VuZCh7c2lnfSkpXG4gICAgfSxcbiAgICBtZXRob2RzID0gb2JqID0+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopKVxuICAgICAgICAgICAgLmZpbHRlcihwID0+XG4gICAgICAgICAgICB0eXBlb2Ygb2JqW3BdID09PSAnZnVuY3Rpb24nICYmIHAgIT09ICdjb25zdHJ1Y3RvcicpXG4gICAgfSxcbiAgICBjbG9zZSA9ICgpID0+IHtcbiAgICB9LFxuICAgIGluaXRNYW5hZ2VyID0gYnVzID0+IG1hbmFnZXIuaW5pdChidXMsIHtcbiAgICAgICAgbm9kZSwgcmVxdWVzdCwgc2lnbmFsLCAvLyBUT0RPXG4gICAgfSlcblxudmFyIENvbm5lY3Rpb25cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGdldCBidXMgKCkge3JldHVybiBub2RlLmJ1c30sXG4gICAgc2V0IGJ1cyAoYikge25vZGUuYnVzID0gYn0sXG5cbiAgICBzZXQgQ29ubmVjdGlvbiAoYykge0Nvbm5lY3Rpb24gPSBjfSxcblxuICAgIGNvbm5lY3Rpb25zOiBub2RlLmNvbm5lY3Rpb25zLFxuXG4gICAgZ2V0IG5hbWUgKCkge3JldHVybiBub2RlLm5hbWV9LFxuICAgIHNldCBuYW1lIChuKSB7bm9kZS5uYW1lID0gbn0sXG5cbiAgICBvYmplY3RzOiBub2RlLm9iamVjdHMsXG4gICAgc2lnbmFsczogbm9kZS5zaWduYWxzLFxuXG4gICAgYWRkQ2hpbGQsXG4gICAgc3RhcnRTZXJ2ZXIsXG4gICAgcm91dGUsXG4gICAgYmluZCxcbiAgICByZXF1ZXN0LFxuICAgIHJlcGx5LFxuICAgIHNpZ3JvdXRlLFxuICAgIHNpZ25hbCxcbiAgICBjbG9zZSxcbiAgICBpbml0TWFuYWdlclxufSIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5pbXBvcnQgbm9kZSBmcm9tICcuL25vZGUnXG5cbmNvbnN0IEV4ZWN1dG9yID0gKF9yLCBfaikgPT4gKHtcbiAgICBwcm9taXNlOiBuZXcgUHJvbWlzZSgociwgaikgPT4ge19yID0gcjsgX2ogPSBqfSksXG4gICAgcmVzb2x2ZTogdiA9PiBfcih2KSxcbiAgICByZWplY3Q6IGUgPT4gX2ooZSlcbn0pXG5sZXQgYnVzRXhlY3V0b3IgPSBFeGVjdXRvcigpXG5cbmNsYXNzIEJ1cyBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgc3RhdGljIHN0YXJ0ICgpIHtcbiAgICAgICAgaWYgKENvbm5lY3Rpb24gJiYgIW5vZGUuYnVzKSB7XG4gICAgICAgICAgICBsZXQgYnVzID0gbmV3IEJ1cyhDb25uZWN0aW9uLmNvbnRleHQpXG4gICAgICAgICAgICAgICAgLm9uKCdjb25uZWN0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmJ1cyA9IGJ1c1xuICAgICAgICAgICAgICAgICAgICBidXNFeGVjdXRvci5yZXNvbHZlKGJ1cylcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBidXNFeGVjdXRvci5wcm9taXNlXG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IgKGNvbnRleHQpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICBpZiAoIWNvbnRleHQpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBidXMgY29udGV4dCcpXG4gICAgICAgIGlmIChjb250ZXh0LnBhcmVudCkge1xuICAgICAgICAgICAgbGV0IGNvbm4gPSBub2RlLmJpbmQoQ29ubmVjdGlvbi5jcmVhdGVQYXJlbnRDb25uZWN0aW9uKGNvbnRleHQucGFyZW50KVxuICAgICAgICAgICAgICAgIC5vbignb3BlbicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcmVudCBvcGVuJylcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5oZWxsbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGJ1cyBuYW1lIGlzICR7ZGF0YS5oZWxsb31gKVxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gZGF0YS5oZWxsb1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubi5uYW1lID0gYCR7bm9kZS5uYW1lfTBgXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmluaXRNYW5hZ2VyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc3RhcnRTZXJ2ZXIoY29udGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGFyZW50IGVycm9yJywgZXJyKVxuICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgY29ubi5pZCA9IDBcbiAgICAgICAgICAgIG5vZGUuY29ubmVjdGlvbnNbMF0gPSBjb25uXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub2RlLnJvb3QgPSB0cnVlXG4gICAgICAgICAgICBub2RlLm5hbWUgPSAnLydcbiAgICAgICAgICAgIG5vZGUuaW5pdE1hbmFnZXIoKVxuICAgICAgICAgICAgbm9kZS5zdGFydFNlcnZlcihjb250ZXh0KVxuICAgICAgICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IHRoaXMuZW1pdCgnY29ubmVjdCcpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IG5hbWUgKCkge1xuICAgICAgICByZXR1cm4gbm9kZS5uYW1lXG4gICAgfVxuXG4gICAgcmVnaXN0ZXJPYmplY3QgKG5hbWUsIG9iaiwgaWZhY2UgPSAobWV0aG9kcyhvYmopKSkge1xuICAgICAgICBjb25zb2xlLmxvZyhgcmVnaXN0ZXJPYmplY3QgJHtuYW1lfSBhdCAke25vZGUubmFtZX0gaW50ZXJmYWNlYCwgaWZhY2UpXG4gICAgICAgIG5vZGUub2JqZWN0c1tuYW1lXSA9IHtvYmosIGlmYWNlfVxuICAgIH1cblxuICAgIHVucmVnaXN0ZXJPYmplY3QgKCkge1xuICAgICAgICAvL1RPRE9cbiAgICB9XG5cbiAgICByZXF1ZXN0IChuYW1lLCAuLi5hcmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZXF1ZXN0JywgbmFtZSwgYXJncylcbiAgICAgICAgY29uc3QgWywgcGF0aCwgaWZhY2UsIG1lbWJlcl0gPSAvXihbL1xcZF0rKShcXHcrKS4oXFx3KykkLy5leGVjKG5hbWUpXG4gICAgICAgIHJldHVybiBub2RlLnJlcXVlc3Qoe3BhdGgsIGludGVyZmFjZTogaWZhY2UsIG1lbWJlciwgYXJnc30pXG4gICAgICAgICAgICAuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHJlcXVlc3QgJHtuYW1lfSByZWplY3RlZCAke2V9YClcbiAgICAgICAgICAgICAgICB0aHJvdyBlXG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHNpZ25hbCAobmFtZSwgYXJncykge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdzaWduYWwnLCBuYW1lLCBhcmdzKVxuICAgICAgICBjb25zdCBbLCBwYXRoLCBpZmFjZSwgbWVtYmVyXSA9IC9eKFsvXFxkXSspKFxcdyspLihcXHcrKSQvLmV4ZWMobmFtZSlcbiAgICAgICAgcmV0dXJuIG5vZGUuc2lnbmFsKHtuYW1lLCBwYXRoLCBpbnRlcmZhY2U6IGlmYWNlLCBtZW1iZXIsIGFyZ3N9KVxuICAgIH1cblxuICAgIHJlZ2lzdGVyTGlzdGVuZXIgKG5hbWUsIGNiKSB7XG4gICAgICAgIC8vY29uc3QgWywgcGF0aCwgaWZhY2UsIG1lbWJlcl0gPSAvXihbL1xcZF0rKShcXHcrKS4oXFx3KykkLy5leGVjKG5hbWUpXG4gICAgICAgIC8vVE9ET1xuICAgICAgICBub2RlLnNpZ25hbHMub24obmFtZSwgY2IpXG4gICAgfVxuXG4gICAgdW5yZWdpc3Rlckxpc3RlbmVyICgpIHtcbiAgICAgICAgLy9UT0RPXG4gICAgfVxuXG4gICAgY2xvc2UgKCkge1xuICAgICAgICBub2RlLmNsb3NlXG4gICAgfVxufVxuXG5sZXQgQ29ubmVjdGlvbiAvL3NldENvbm5lY3Rpb25cblxuZXhwb3J0IGZ1bmN0aW9uIHNldENvbm5lY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKENvbm5lY3Rpb24pIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNoYW5nZSBDb25uZWN0aW9uJylcbiAgICBDb25uZWN0aW9uID0gbm9kZS5Db25uZWN0aW9uID0gdmFsdWVcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIHN0YXJ0IChjb250ZXh0KSB7XG4gICAgICAgIENvbm5lY3Rpb24uY3JlYXRlKGNvbnRleHQpXG4gICAgICAgIHJldHVybiBCdXMuc3RhcnQoKVxuICAgIH0sXG4gICAgZ2V0IGJ1cyAoKSB7XG4gICAgICAgIGlmICghbm9kZS5idXMpIHRocm93IG5ldyBFcnJvcignQnVzIG5vdCBzdGFydGVkJylcbiAgICAgICAgcmV0dXJuIG5vZGUuYnVzXG4gICAgfSxcbiAgICBwcm94eSAoaWZhY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICAgICAgZ2V0IChfLCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICguLi5hcmdzKSA9PlxuICAgICAgICAgICAgICAgICAgICBub2RlLnJlcXVlc3Qoe3BhdGg6ICcvJywgaW50ZXJmYWNlOiBpZmFjZSwgbWVtYmVyOiBuYW1lLCBhcmdzfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuXG5jbGFzcyBDb25uZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvciAod3MpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICB0aGlzLndzID0gd3NcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXNcbiAgICAgICAgd3Mub25vcGVuID0gKCkgPT5cbiAgICAgICAgICAgIHNlbGYuZW1pdCgnb3BlbicpXG4gICAgICAgIHdzLm9ubWVzc2FnZSA9IGV2ID0+XG4gICAgICAgICAgICBzZWxmLmVtaXQoJ2RhdGEnLCBKU09OLnBhcnNlKGV2LmRhdGEpKVxuICAgICAgICB3cy5vbmNsb3NlID0gZXYgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24gY2xvc2UnLCB0aGlzLm5hbWUpXG4gICAgICAgICAgICBzZWxmLmVtaXQoJ2Nsb3NlJylcbiAgICAgICAgfVxuICAgICAgICB3cy5vbmVycm9yID0gZXYgPT5cbiAgICAgICAgICAgIHNlbGYuZW1pdCgnZXJyb3InLCBldilcbiAgICB9XG4gICAgc2VuZCAoZGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZyhgY29ubmVjdGlvbiAke3RoaXMubmFtZX0gc2VuZGAsIGRhdGEpXG4gICAgICAgIHRoaXMud3Muc2VuZChKU09OLnN0cmluZ2lmeShkYXRhKSlcbiAgICB9XG59XG5cbmxldCBjb250ZXh0XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBjcmVhdGVQYXJlbnRDb25uZWN0aW9uIChwYXJlbnQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb25uZWN0aW9uKG5ldyBXZWJTb2NrZXQocGFyZW50LnVybCkpXG4gICAgfSxcbiAgICBjcmVhdGVTZXJ2ZXIgKHtob3N0LCBwb3J0LCBzZXJ2ZXJ9KSB7XG4gICAgICAgIHRocm93ICgnbm90IGltcGxlbWVudGVkJylcbiAgICB9LFxuICAgIGNyZWF0ZSAoY29udGV4dCkge1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgfSxcbiAgICBzZXQgY29udGV4dCAodmFsdWUpIHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNoYW5nZSBjb250ZXh0JylcbiAgICAgICAgY29udGV4dCA9IHZhbHVlXG4gICAgfSxcbiAgICBnZXQgY29udGV4dCAoKSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0IHx8IHtwYXJlbnQ6IHt1cmw6IGAke2xvY2F0aW9uLnByb3RvY29sID09PSdodHRwczonID8gJ3dzcycgOiAnd3MnfTovLyR7bG9jYXRpb24uaG9zdH1gfX1cbiAgICB9XG59XG4iLCJpbXBvcnQge3NldENvbm5lY3Rpb259IGZyb20gJy4vQnVzJ1xuaW1wb3J0IENvbm5lY3Rpb24gZnJvbSAnLi9Ccm93c2VyQ29ubmVjdGlvbidcbnNldENvbm5lY3Rpb24oQ29ubmVjdGlvbilcblxuZXhwb3J0IHtkZWZhdWx0IGFzIEJ1c30gZnJvbSAnLi9CdXMnXG5leHBvcnQge2RlZmF1bHQgYXMgQ29ubmVjdGlvbn0gZnJvbSAnLi9Ccm93c2VyQ29ubmVjdGlvbidcbmV4cG9ydCB7ZGVmYXVsdCBhcyBFdmVudEVtaXR0ZXJ9IGZyb20gJy4vRXZlbnRFbWl0dGVyJyJdLCJuYW1lcyI6WyJDb25uZWN0aW9uIiwibWV0aG9kcyIsIm1hbmFnZXIiLCJub2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLFlBQVksQ0FBQztJQUNmLFdBQVcsQ0FBQyxHQUFHO1FBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRTtLQUMxQjtJQUNELFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7UUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ3BDLE9BQU8sSUFBSTtLQUNkOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFxQkQsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxFQUFFO1FBQ2pCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztRQUNsQyxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ3pCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSztnQkFDaEIsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDbkIsT0FBTyxJQUFJO1NBQ2Q7UUFDRCxPQUFPLEtBQUs7S0FDZjtDQUNKOztBQUVELFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsV0FBVyxBQUU5RDs7QUN4Q0EsSUFBYSxHQUFHO0lBQUUsRUFBRTs7QUFFcEIsTUFBTSxPQUFPLENBQUM7SUFDVixX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

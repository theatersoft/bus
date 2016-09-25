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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci1idXMuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9FdmVudEVtaXR0ZXIuanMiLCIuLi9zcmMvTWFuYWdlci5qcyIsIi4uL3NyYy9ub2RlLmpzIiwiLi4vc3JjL0J1cy5qcyIsIi4uL3NyYy9Ccm93c2VyQ29ubmVjdGlvbi5qcyIsIi4uL3NyYy9icm93c2VyLWJ1bmRsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy5ldmVudHMgPSBuZXcgTWFwKClcbiAgICB9XG4gICAgYWRkTGlzdGVuZXIgKHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzLmhhcyh0eXBlKSB8fCB0aGlzLmV2ZW50cy5zZXQodHlwZSwgW10pXG4gICAgICAgIHRoaXMuZXZlbnRzLmdldCh0eXBlKS5wdXNoKGNhbGxiYWNrKVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgICAvL3JlbW92ZUxpc3RlbmVyICh0eXBlLCBjYWxsYmFjaykge1xuICAgIC8vICAgIGxldFxuICAgIC8vICAgICAgICBldmVudHMgPSB0aGlzLmV2ZW50cy5nZXQodHlwZSksXG4gICAgLy8gICAgICAgIGluZGV4XG4gICAgLy9cbiAgICAvLyAgICBpZiAoZXZlbnRzICYmIGV2ZW50cy5sZW5ndGgpIHtcbiAgICAvLyAgICAgICAgaW5kZXggPSBldmVudHMucmVkdWNlKChpLCBldmVudCwgaW5kZXgpID0+IHtcbiAgICAvLyAgICAgICAgICAgIHJldHVybiAodHlwZW9mIGV2ZW50ID09PSAnZnVuY3Rpb24nICYmIGV2ZW50ID09PSBjYWxsYmFjaylcbiAgICAvLyAgICAgICAgICAgICAgICA/ICBpID0gaW5kZXhcbiAgICAvLyAgICAgICAgICAgICAgICA6IGlcbiAgICAvLyAgICAgICAgfSwgLTEpXG4gICAgLy9cbiAgICAvLyAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAvLyAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgLy8gICAgICAgICAgICB0aGlzLmV2ZW50cy5zZXQodHlwZSwgZXZlbnRzKVxuICAgIC8vICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAvLyAgICAgICAgfVxuICAgIC8vICAgIH1cbiAgICAvLyAgICByZXR1cm4gZmFsc2VcbiAgICAvL31cbiAgICBlbWl0ICh0eXBlLCAuLi5hcmdzKSB7XG4gICAgICAgIGxldCBldmVudHMgPSB0aGlzLmV2ZW50cy5nZXQodHlwZSlcbiAgICAgICAgaWYgKGV2ZW50cyAmJiBldmVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBldmVudHMuZm9yRWFjaChldmVudCA9PlxuICAgICAgICAgICAgICAgIGV2ZW50KC4uLmFyZ3MpKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyXG5cbmV4cG9ydCBkZWZhdWx0IEV2ZW50RW1pdHRlciIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5cbmxldCBtYW5hZ2VyLCBidXMsIF9pXG5cbmNsYXNzIE1hbmFnZXIge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy5uYW1lcyA9IG5ldyBNYXAoKVxuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlciBzdGFydGVkJylcbiAgICB9XG5cbiAgICBpbml0IChfYnVzLCBfaW1wbCkge1xuICAgICAgICBpZiAoYnVzKSB0aHJvdyAncmVpbml0ZWQnXG4gICAgICAgIGJ1cyA9IF9idXNcbiAgICAgICAgX2kgPSBfaW1wbFxuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlciBpbml0JylcbiAgICB9XG5cbiAgICAvLyBUT0RPIG5lZWRzIHJlcXVlc3QgbWV0YWRhdGE6IHNlbmRlclxuICAgIHJlcXVlc3ROYW1lIChuYW1lLCBub2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlcXVlc3ROYW1lJylcbiAgICB9XG5cbiAgICByZWxlYXNlTmFtZSAobmFtZSwgbm9kZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWxlYXNlTmFtZScpXG4gICAgfVxuXG4gICAgcmVnaXN0ZXIgKG5hbWUsIG9iaikge1xuICAgICAgICBpZiAoX2kubm9kZS5yb290KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWdpc3RlciBhcyByb290ICcpXG4gICAgICAgICAgICAvL2J1cy5yZWdpc3Rlck9iamVjdChuYW1lLCBvYmopXG4gICAgICAgICAgICB0aGlzLm5hbWVzLnNldChuYW1lLCBvYmopXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpIC8vIFRPRE8gQnVzT2JqZWN0XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWdpc3RlciBhcyBjaGlsZCAnKVxuICAgICAgICAgICAgcmV0dXJuIGJ1cy5yZXF1ZXN0KCcvQnVzLnJlcXVlc3ROYW1lJywgbmFtZSwgX2kubm9kZS5uYW1lKS50aGVuKHIgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlZ2lzdGVyZWQgJylcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWVzLnNldChuYW1lLCBvYmopXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vY2xhc3MgQnVzRW1pdHRlciB7XG4vL1xuLy99XG4vL1xuLy9jbGFzcyBCdXNPYmplY3Qge1xuLy8gICAgY29uc3RydWN0b3IgKGJ1cykge1xuLy8gICAgICAgIHRoaXMuYnVzID0gYnVzXG4vLyAgICAgICAgdGhpcy5fZW1pdHRlciA9IG5ldyBCdXNFbWl0dGVyKClcbi8vICAgIH1cbi8vXG4vLyAgICBnZXQgZW1pdHRlciAoKSB7cmV0dXJuIHRoaXMuX2VtaXR0ZXJ9XG4vL31cblxuZXhwb3J0IGRlZmF1bHQgbmV3IE1hbmFnZXIoKSIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5pbXBvcnQgbWFuYWdlciBmcm9tICcuL01hbmFnZXInXG5cbmNvbnN0XG4gICAgbm9kZSA9IHtcbiAgICAgICAgLy9idXMsXG4gICAgICAgIC8vbmFtZSxcbiAgICAgICAgLy9zZXJ2ZXIsXG4gICAgICAgIGNvbm5lY3Rpb25zOiBbdW5kZWZpbmVkXSxcbiAgICAgICAgb2JqZWN0czoge30sXG4gICAgICAgIHJlcWlkOiAwLFxuICAgICAgICByZXF1ZXN0czoge30sXG4gICAgICAgIHNpZ25hbHM6IG5ldyBFdmVudEVtaXR0ZXIoKVxuICAgIH0sXG4gICAgYWRkQ2hpbGQgPSBjaGlsZCA9PiB7XG4gICAgICAgIGNoaWxkLmlkID0gbm9kZS5jb25uZWN0aW9ucy5sZW5ndGhcbiAgICAgICAgY2hpbGQubmFtZSA9IGAke25vZGUubmFtZX0ke2NoaWxkLmlkfWBcbiAgICAgICAgY29uc29sZS5sb2coYCR7bm9kZS5uYW1lfSBhZGRpbmcgY2hpbGQgJHtjaGlsZC5uYW1lfWApXG4gICAgICAgIG5vZGUuY29ubmVjdGlvbnMucHVzaChjaGlsZClcbiAgICAgICAgY2hpbGQuc2VuZCh7aGVsbG86IGAke2NoaWxkLm5hbWV9L2B9KVxuICAgIH0sXG4gICAgc3RhcnRTZXJ2ZXIgPSBjb250ZXh0ID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIG5vZGUuc2VydmVyID0gQ29ubmVjdGlvbi5jcmVhdGVTZXJ2ZXIoY29udGV4dC5jaGlsZHJlbilcbiAgICAgICAgICAgICAgICAub24oJ2Nvbm5lY3Rpb24nLCBjb25uZWN0aW9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2hpbGQoYmluZChjb25uZWN0aW9uKSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2VydmVyIGVycm9yJywgZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJvdXRlID0gbiA9PiB7XG4gICAgICAgIGxldCBpID0gbi5sYXN0SW5kZXhPZignLycpXG4gICAgICAgIGlmIChpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG5hbWUnKVxuICAgICAgICBsZXRcbiAgICAgICAgICAgIHBhdGggPSBuLnNsaWNlKDAsIGkgKyAxKSxcbiAgICAgICAgICAgIHIgPSBwYXRoID09PSBub2RlLm5hbWUgPyBudWxsXG4gICAgICAgICAgICAgICAgOiBwYXRoLnN0YXJ0c1dpdGgoKG5vZGUubmFtZSkpID8gbm9kZS5jb25uZWN0aW9uc1twYXJzZUludChwYXRoLnNsaWNlKG5vZGUubmFtZS5sZW5ndGgpKV1cbiAgICAgICAgICAgICAgICA6IG5vZGUuY29ubmVjdGlvbnNbMF1cbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcm91dGluZyB0byAke3BhdGh9IGZyb20gJHtub2RlLm5hbWV9IHJldHVybnMgJHtyICYmIHIubmFtZX1gKVxuICAgICAgICByZXR1cm4gclxuICAgIH0sXG4gICAgYmluZCA9IGNvbm4gPT4ge1xuICAgICAgICByZXR1cm4gY29ublxuICAgICAgICAgICAgLm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgZGF0YSBmcm9tICR7Y29ubi5uYW1lfWAsIGRhdGEpXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoZGF0YS5yZXEpLnRoZW4oXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBseSh7aWQ6IGRhdGEucmVxLmlkLCBwYXRoOiBkYXRhLnJlcS5zZW5kZXIsIGFyZ3M6IHJlc30pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEucmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcGx5KGRhdGEucmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgc2lnbmFsKGRhdGEuc2lnLCBjb25uLmlkKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjb25uZWN0aW9uIGNsb3NlICR7Y29ubi5uYW1lfWApXG4gICAgICAgICAgICAgICAgbm9kZS5jb25uZWN0aW9uc1tjb25uLmlkXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgfSlcbiAgICB9LFxuICAgIHJlcXVlc3QgPSByZXEgPT4ge1xuICAgICAgICBsZXQgY29ubiA9IHJvdXRlKHJlcS5wYXRoKVxuICAgICAgICBpZiAoY29ubikge1xuICAgICAgICAgICAgaWYgKHJlcS5zZW5kZXIpXG4gICAgICAgICAgICAgICAgY29ubi5zZW5kKHtyZXF9KVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNlbmRlciA9IG5vZGUubmFtZVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgociwgaikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXEuaWQgPSBub2RlLnJlcWlkKytcbiAgICAgICAgICAgICAgICAgICAgY29ubi5zZW5kKHtyZXF9KVxuICAgICAgICAgICAgICAgICAgICBub2RlLnJlcXVlc3RzW3JlcS5pZF0gPSB7ciwgaiwgcmVxfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29ubiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbGV0IG9iaiA9IG5vZGUub2JqZWN0c1tyZXEuaW50ZXJmYWNlXSAmJiBub2RlLm9iamVjdHNbcmVxLmludGVyZmFjZV0ub2JqXG4gICAgICAgICAgICBpZiAoIW9iaikgcmV0dXJuIFByb21pc2UucmVqZWN0KGBFcnJvciBpbnRlcmZhY2UgJHtyZXEuaW50ZXJmYWNlfSBvYmplY3Qgbm90IGZvdW5kYClcbiAgICAgICAgICAgIGxldCBtZW1iZXIgPSBvYmpbcmVxLm1lbWJlcl0sIGFyZ3MgPSByZXEuYXJncyAvLyB3b3JrYXJvdW5kIHVnbGlmeSBwYXJzZSBlcnJvclxuICAgICAgICAgICAgaWYgKCFtZW1iZXIpIHJldHVybiBQcm9taXNlLnJlamVjdChgRXJyb3IgbWVtYmVyICR7cmVxLm1lbWJlcn0gbm90IGZvdW5kYClcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShvYmpbcmVxLm1lbWJlcl0oLi4uYXJncykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChgRXhjZXB0aW9uIGNhbGxpbmcgaW50ZXJmYWNlICR7cmVxLmludGVyZmFjZX0gb2JqZWN0IG1lbWJlciAke3JlcS5tZW1iZXJ9ICR7ZX1gKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbm4gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnY29ubmVjdGlvbiBlcnJvcicpIC8vIFRPRE9cbiAgICB9LFxuICAgIHJlcGx5ID0gcmVzID0+IHtcbiAgICAgICAgbGV0IGNvbm4gPSByb3V0ZShyZXMucGF0aClcbiAgICAgICAgaWYgKGNvbm4pXG4gICAgICAgICAgICBjb25uLnNlbmQoe3Jlc30pXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IHIgPSBub2RlLnJlcXVlc3RzW3Jlcy5pZF1cbiAgICAgICAgICAgIGRlbGV0ZSBub2RlLnJlcXVlc3RzW3Jlcy5pZF1cbiAgICAgICAgICAgIHIucihyZXMuYXJncylcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2lncm91dGUgPSAobmFtZSwgZnJvbSkgPT4ge1xuICAgICAgICBsZXQgciA9IG5vZGUuY29ubmVjdGlvbnMuZmlsdGVyKGMgPT4gYyAmJiBjLmlkICE9PSBmcm9tKVxuICAgICAgICAvL2NvbnNvbGUubG9nKGBzaWdyb3V0aW5nICR7bmFtZX0gZnJvbSAke2Zyb219IHJldHVybnMgJHtyLm1hcChjID0+IGMuaWQpfWApXG4gICAgICAgIHJldHVybiByXG4gICAgfSxcbiAgICBzaWduYWwgPSAoc2lnLCBmcm9tKSA9PiB7XG4gICAgICAgIG5vZGUuc2lnbmFscy5lbWl0KHNpZy5uYW1lLCBzaWcuYXJncylcbiAgICAgICAgc2lncm91dGUoc2lnLm5hbWUsIGZyb20pLmZvckVhY2goYyA9PiBjICYmIGMuc2VuZCh7c2lnfSkpXG4gICAgfSxcbiAgICBtZXRob2RzID0gb2JqID0+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopKVxuICAgICAgICAgICAgLmZpbHRlcihwID0+XG4gICAgICAgICAgICB0eXBlb2Ygb2JqW3BdID09PSAnZnVuY3Rpb24nICYmIHAgIT09ICdjb25zdHJ1Y3RvcicpXG4gICAgfSxcbiAgICBjbG9zZSA9ICgpID0+IHtcbiAgICB9LFxuICAgIGluaXRNYW5hZ2VyID0gYnVzID0+IG1hbmFnZXIuaW5pdChidXMsIHtcbiAgICAgICAgbm9kZSwgcmVxdWVzdCwgc2lnbmFsLCAvLyBUT0RPXG4gICAgfSlcblxudmFyIENvbm5lY3Rpb25cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGdldCBidXMgKCkge3JldHVybiBub2RlLmJ1c30sXG4gICAgc2V0IGJ1cyAoYikge25vZGUuYnVzID0gYn0sXG5cbiAgICBzZXQgQ29ubmVjdGlvbiAoYykge0Nvbm5lY3Rpb24gPSBjfSxcblxuICAgIGNvbm5lY3Rpb25zOiBub2RlLmNvbm5lY3Rpb25zLFxuXG4gICAgZ2V0IG5hbWUgKCkge3JldHVybiBub2RlLm5hbWV9LFxuICAgIHNldCBuYW1lIChuKSB7bm9kZS5uYW1lID0gbn0sXG5cbiAgICBvYmplY3RzOiBub2RlLm9iamVjdHMsXG4gICAgc2lnbmFsczogbm9kZS5zaWduYWxzLFxuXG4gICAgYWRkQ2hpbGQsXG4gICAgc3RhcnRTZXJ2ZXIsXG4gICAgcm91dGUsXG4gICAgYmluZCxcbiAgICByZXF1ZXN0LFxuICAgIHJlcGx5LFxuICAgIHNpZ3JvdXRlLFxuICAgIHNpZ25hbCxcbiAgICBjbG9zZSxcbiAgICBpbml0TWFuYWdlclxufSIsIi8qXG4gQ29weXJpZ2h0IChDKSAyMDE2IFRoZWF0ZXJzb2Z0XG5cbiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBBZmZlcm8gR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgdmVyc2lvbiAzLlxuXG4gVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBHTlUgQWZmZXJvIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBBZmZlcm8gR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS4gSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+XG5cbiAqL1xuXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuaW1wb3J0IG5vZGUgZnJvbSAnLi9ub2RlJ1xuXG5jb25zdCBFeGVjdXRvciA9IChfciwgX2opID0+ICh7XG4gICAgcHJvbWlzZTogbmV3IFByb21pc2UoKHIsIGopID0+IHtfciA9IHI7IF9qID0gan0pLFxuICAgIHJlc29sdmU6IHYgPT4gX3IodiksXG4gICAgcmVqZWN0OiBlID0+IF9qKGUpXG59KVxubGV0IGJ1c0V4ZWN1dG9yID0gRXhlY3V0b3IoKVxuXG5jbGFzcyBCdXMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIHN0YXRpYyBzdGFydCAoKSB7XG4gICAgICAgIGlmIChDb25uZWN0aW9uICYmICFub2RlLmJ1cykge1xuICAgICAgICAgICAgbGV0IGJ1cyA9IG5ldyBCdXMoQ29ubmVjdGlvbi5jb250ZXh0KVxuICAgICAgICAgICAgICAgIC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5idXMgPSBidXNcbiAgICAgICAgICAgICAgICAgICAgYnVzRXhlY3V0b3IucmVzb2x2ZShidXMpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVzRXhlY3V0b3IucHJvbWlzZVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yIChjb250ZXh0KSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgaWYgKCFjb250ZXh0KSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYnVzIGNvbnRleHQnKVxuICAgICAgICBpZiAoY29udGV4dC5wYXJlbnQpIHtcbiAgICAgICAgICAgIGxldCBjb25uID0gbm9kZS5iaW5kKENvbm5lY3Rpb24uY3JlYXRlUGFyZW50Q29ubmVjdGlvbihjb250ZXh0LnBhcmVudClcbiAgICAgICAgICAgICAgICAub24oJ29wZW4nLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJlbnQgb3BlbicpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaGVsbG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBidXMgbmFtZSBpcyAke2RhdGEuaGVsbG99YClcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IGRhdGEuaGVsbG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm4ubmFtZSA9IGAke25vZGUubmFtZX0wYFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5pbml0TWFuYWdlcigpXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0YXJ0U2VydmVyKGNvbnRleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcmVudCBlcnJvcicsIGVycilcbiAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIGNvbm4uaWQgPSAwXG4gICAgICAgICAgICBub2RlLmNvbm5lY3Rpb25zWzBdID0gY29ublxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbm9kZS5yb290ID0gdHJ1ZVxuICAgICAgICAgICAgbm9kZS5uYW1lID0gJy8nXG4gICAgICAgICAgICBub2RlLmluaXRNYW5hZ2VyKClcbiAgICAgICAgICAgIG5vZGUuc3RhcnRTZXJ2ZXIoY29udGV4dClcbiAgICAgICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiB0aGlzLmVtaXQoJ2Nvbm5lY3QnKSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBuYW1lICgpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubmFtZVxuICAgIH1cblxuICAgIHJlZ2lzdGVyT2JqZWN0IChuYW1lLCBvYmosIGlmYWNlID0gKG1ldGhvZHMob2JqKSkpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHJlZ2lzdGVyT2JqZWN0ICR7bmFtZX0gYXQgJHtub2RlLm5hbWV9IGludGVyZmFjZWAsIGlmYWNlKVxuICAgICAgICBub2RlLm9iamVjdHNbbmFtZV0gPSB7b2JqLCBpZmFjZX1cbiAgICB9XG5cbiAgICB1bnJlZ2lzdGVyT2JqZWN0ICgpIHtcbiAgICAgICAgLy9UT0RPXG4gICAgfVxuXG4gICAgcmVxdWVzdCAobmFtZSwgLi4uYXJncykge1xuICAgICAgICBjb25zb2xlLmxvZygncmVxdWVzdCcsIG5hbWUsIGFyZ3MpXG4gICAgICAgIGNvbnN0IFssIHBhdGgsIGlmYWNlLCBtZW1iZXJdID0gL14oWy9cXGRdKykoXFx3KykuKFxcdyspJC8uZXhlYyhuYW1lKVxuICAgICAgICByZXR1cm4gbm9kZS5yZXF1ZXN0KHtwYXRoLCBpbnRlcmZhY2U6IGlmYWNlLCBtZW1iZXIsIGFyZ3N9KVxuICAgICAgICAgICAgLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGByZXF1ZXN0ICR7bmFtZX0gcmVqZWN0ZWQgJHtlfWApXG4gICAgICAgICAgICAgICAgdGhyb3cgZVxuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzaWduYWwgKG5hbWUsIGFyZ3MpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnc2lnbmFsJywgbmFtZSwgYXJncylcbiAgICAgICAgY29uc3QgWywgcGF0aCwgaWZhY2UsIG1lbWJlcl0gPSAvXihbL1xcZF0rKShcXHcrKS4oXFx3KykkLy5leGVjKG5hbWUpXG4gICAgICAgIHJldHVybiBub2RlLnNpZ25hbCh7bmFtZSwgcGF0aCwgaW50ZXJmYWNlOiBpZmFjZSwgbWVtYmVyLCBhcmdzfSlcbiAgICB9XG5cbiAgICByZWdpc3Rlckxpc3RlbmVyIChuYW1lLCBjYikge1xuICAgICAgICAvL2NvbnN0IFssIHBhdGgsIGlmYWNlLCBtZW1iZXJdID0gL14oWy9cXGRdKykoXFx3KykuKFxcdyspJC8uZXhlYyhuYW1lKVxuICAgICAgICAvL1RPRE9cbiAgICAgICAgbm9kZS5zaWduYWxzLm9uKG5hbWUsIGNiKVxuICAgIH1cblxuICAgIHVucmVnaXN0ZXJMaXN0ZW5lciAoKSB7XG4gICAgICAgIC8vVE9ET1xuICAgIH1cblxuICAgIGNsb3NlICgpIHtcbiAgICAgICAgbm9kZS5jbG9zZVxuICAgIH1cbn1cblxubGV0IENvbm5lY3Rpb24gLy9zZXRDb25uZWN0aW9uXG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRDb25uZWN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChDb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjaGFuZ2UgQ29ubmVjdGlvbicpXG4gICAgQ29ubmVjdGlvbiA9IG5vZGUuQ29ubmVjdGlvbiA9IHZhbHVlXG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBzdGFydCAoY29udGV4dCkge1xuICAgICAgICBDb25uZWN0aW9uLmNyZWF0ZShjb250ZXh0KVxuICAgICAgICByZXR1cm4gQnVzLnN0YXJ0KClcbiAgICB9LFxuICAgIGdldCBidXMgKCkge1xuICAgICAgICBpZiAoIW5vZGUuYnVzKSB0aHJvdyBuZXcgRXJyb3IoJ0J1cyBub3Qgc3RhcnRlZCcpXG4gICAgICAgIHJldHVybiBub2RlLmJ1c1xuICAgIH0sXG4gICAgcHJveHkgKGlmYWNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgICAgIGdldCAoXywgbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJncykgPT5cbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZXF1ZXN0KHtwYXRoOiAnLycsIGludGVyZmFjZTogaWZhY2UsIG1lbWJlcjogbmFtZSwgYXJnc30pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlcidcblxuY2xhc3MgQ29ubmVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3IgKHdzKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy53cyA9IHdzXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzXG4gICAgICAgIHdzLm9ub3BlbiA9ICgpID0+XG4gICAgICAgICAgICBzZWxmLmVtaXQoJ29wZW4nKVxuICAgICAgICB3cy5vbm1lc3NhZ2UgPSBldiA9PlxuICAgICAgICAgICAgc2VsZi5lbWl0KCdkYXRhJywgSlNPTi5wYXJzZShldi5kYXRhKSlcbiAgICAgICAgd3Mub25jbG9zZSA9IGV2ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIGNsb3NlJywgdGhpcy5uYW1lKVxuICAgICAgICAgICAgc2VsZi5lbWl0KCdjbG9zZScpXG4gICAgICAgIH1cbiAgICAgICAgd3Mub25lcnJvciA9IGV2ID0+XG4gICAgICAgICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXYpXG4gICAgfVxuICAgIHNlbmQgKGRhdGEpIHtcbiAgICAgICAgY29uc29sZS5sb2coYGNvbm5lY3Rpb24gJHt0aGlzLm5hbWV9IHNlbmRgLCBkYXRhKVxuICAgICAgICB0aGlzLndzLnNlbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpXG4gICAgfVxufVxuXG5sZXQgY29udGV4dFxuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgY3JlYXRlUGFyZW50Q29ubmVjdGlvbiAocGFyZW50KSB7XG4gICAgICAgIHJldHVybiBuZXcgQ29ubmVjdGlvbihuZXcgV2ViU29ja2V0KHBhcmVudC51cmwpKVxuICAgIH0sXG4gICAgY3JlYXRlU2VydmVyICh7aG9zdCwgcG9ydCwgc2VydmVyfSkge1xuICAgICAgICB0aHJvdyAoJ25vdCBpbXBsZW1lbnRlZCcpXG4gICAgfSxcbiAgICBjcmVhdGUgKGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dFxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH0sXG4gICAgc2V0IGNvbnRleHQgKHZhbHVlKSB7XG4gICAgICAgIGlmIChjb250ZXh0KSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjaGFuZ2UgY29udGV4dCcpXG4gICAgICAgIGNvbnRleHQgPSB2YWx1ZVxuICAgIH0sXG4gICAgZ2V0IGNvbnRleHQgKCkge1xuICAgICAgICByZXR1cm4gY29udGV4dCB8fCB7cGFyZW50OiB7dXJsOiBgJHtsb2NhdGlvbi5wcm90b2NvbCA9PT0naHR0cHM6JyA/ICd3c3MnIDogJ3dzJ306Ly8ke2xvY2F0aW9uLmhvc3R9YH19XG4gICAgfVxufVxuIiwiaW1wb3J0IHtzZXRDb25uZWN0aW9ufSBmcm9tICcuL0J1cydcbmltcG9ydCBDb25uZWN0aW9uIGZyb20gJy4vQnJvd3NlckNvbm5lY3Rpb24nXG5zZXRDb25uZWN0aW9uKENvbm5lY3Rpb24pXG5cbmV4cG9ydCB7ZGVmYXVsdCBhcyBCdXN9IGZyb20gJy4vQnVzJ1xuZXhwb3J0IHtkZWZhdWx0IGFzIENvbm5lY3Rpb259IGZyb20gJy4vQnJvd3NlckNvbm5lY3Rpb24nXG5leHBvcnQge2RlZmF1bHQgYXMgRXZlbnRFbWl0dGVyfSBmcm9tICcuL0V2ZW50RW1pdHRlciciXSwibmFtZXMiOlsiQ29ubmVjdGlvbiIsIm1ldGhvZHMiLCJtYW5hZ2VyIiwibm9kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTSxZQUFZLENBQUM7SUFDZixXQUFXLENBQUMsR0FBRztRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUU7S0FDMUI7SUFDRCxXQUFXLENB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

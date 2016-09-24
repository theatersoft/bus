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

var Connection //setConnection

var Bus$1 = {
    set connection (value) {
        if (Connection) throw new Error('Cannot change Connection')
        Connection = node$1.Connection = value
    },
    start (connection) {
        if (connection)
            this.connection = connection
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

var BrowserConnection = {
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

exports.Bus = Bus$1;
exports.Connection = BrowserConnection;
exports.EventEmitter = EventEmitter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci1idXMuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9FdmVudEVtaXR0ZXIuanMiLCIuLi9zcmMvTWFuYWdlci5qcyIsIi4uL3NyYy9ub2RlLmpzIiwiLi4vc3JjL0J1cy5qcyIsIi4uL3NyYy9Ccm93c2VyQ29ubmVjdGlvbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy5ldmVudHMgPSBuZXcgTWFwKClcbiAgICB9XG4gICAgYWRkTGlzdGVuZXIgKHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzLmhhcyh0eXBlKSB8fCB0aGlzLmV2ZW50cy5zZXQodHlwZSwgW10pXG4gICAgICAgIHRoaXMuZXZlbnRzLmdldCh0eXBlKS5wdXNoKGNhbGxiYWNrKVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgICAvL3JlbW92ZUxpc3RlbmVyICh0eXBlLCBjYWxsYmFjaykge1xuICAgIC8vICAgIGxldFxuICAgIC8vICAgICAgICBldmVudHMgPSB0aGlzLmV2ZW50cy5nZXQodHlwZSksXG4gICAgLy8gICAgICAgIGluZGV4XG4gICAgLy9cbiAgICAvLyAgICBpZiAoZXZlbnRzICYmIGV2ZW50cy5sZW5ndGgpIHtcbiAgICAvLyAgICAgICAgaW5kZXggPSBldmVudHMucmVkdWNlKChpLCBldmVudCwgaW5kZXgpID0+IHtcbiAgICAvLyAgICAgICAgICAgIHJldHVybiAodHlwZW9mIGV2ZW50ID09PSAnZnVuY3Rpb24nICYmIGV2ZW50ID09PSBjYWxsYmFjaylcbiAgICAvLyAgICAgICAgICAgICAgICA/ICBpID0gaW5kZXhcbiAgICAvLyAgICAgICAgICAgICAgICA6IGlcbiAgICAvLyAgICAgICAgfSwgLTEpXG4gICAgLy9cbiAgICAvLyAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAvLyAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgLy8gICAgICAgICAgICB0aGlzLmV2ZW50cy5zZXQodHlwZSwgZXZlbnRzKVxuICAgIC8vICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAvLyAgICAgICAgfVxuICAgIC8vICAgIH1cbiAgICAvLyAgICByZXR1cm4gZmFsc2VcbiAgICAvL31cbiAgICBlbWl0ICh0eXBlLCAuLi5hcmdzKSB7XG4gICAgICAgIGxldCBldmVudHMgPSB0aGlzLmV2ZW50cy5nZXQodHlwZSlcbiAgICAgICAgaWYgKGV2ZW50cyAmJiBldmVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBldmVudHMuZm9yRWFjaChldmVudCA9PlxuICAgICAgICAgICAgICAgIGV2ZW50KC4uLmFyZ3MpKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyXG5cbmV4cG9ydCBkZWZhdWx0IEV2ZW50RW1pdHRlciIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5cbmxldCBtYW5hZ2VyLCBidXMsIF9pXG5cbmNsYXNzIE1hbmFnZXIge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy5uYW1lcyA9IG5ldyBNYXAoKVxuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlciBzdGFydGVkJylcbiAgICB9XG5cbiAgICBpbml0IChfYnVzLCBfaW1wbCkge1xuICAgICAgICBpZiAoYnVzKSB0aHJvdyAncmVpbml0ZWQnXG4gICAgICAgIGJ1cyA9IF9idXNcbiAgICAgICAgX2kgPSBfaW1wbFxuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlciBpbml0JylcbiAgICB9XG5cbiAgICAvLyBUT0RPIG5lZWRzIHJlcXVlc3QgbWV0YWRhdGE6IHNlbmRlclxuICAgIHJlcXVlc3ROYW1lIChuYW1lLCBub2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlcXVlc3ROYW1lJylcbiAgICB9XG5cbiAgICByZWxlYXNlTmFtZSAobmFtZSwgbm9kZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWxlYXNlTmFtZScpXG4gICAgfVxuXG4gICAgcmVnaXN0ZXIgKG5hbWUsIG9iaikge1xuICAgICAgICBpZiAoX2kubm9kZS5yb290KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWdpc3RlciBhcyByb290ICcpXG4gICAgICAgICAgICAvL2J1cy5yZWdpc3Rlck9iamVjdChuYW1lLCBvYmopXG4gICAgICAgICAgICB0aGlzLm5hbWVzLnNldChuYW1lLCBvYmopXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpIC8vIFRPRE8gQnVzT2JqZWN0XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTWFuYWdlci5yZWdpc3RlciBhcyBjaGlsZCAnKVxuICAgICAgICAgICAgcmV0dXJuIGJ1cy5yZXF1ZXN0KCcvQnVzLnJlcXVlc3ROYW1lJywgbmFtZSwgX2kubm9kZS5uYW1lKS50aGVuKHIgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYW5hZ2VyLnJlZ2lzdGVyZWQgJylcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWVzLnNldChuYW1lLCBvYmopXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vY2xhc3MgQnVzRW1pdHRlciB7XG4vL1xuLy99XG4vL1xuLy9jbGFzcyBCdXNPYmplY3Qge1xuLy8gICAgY29uc3RydWN0b3IgKGJ1cykge1xuLy8gICAgICAgIHRoaXMuYnVzID0gYnVzXG4vLyAgICAgICAgdGhpcy5fZW1pdHRlciA9IG5ldyBCdXNFbWl0dGVyKClcbi8vICAgIH1cbi8vXG4vLyAgICBnZXQgZW1pdHRlciAoKSB7cmV0dXJuIHRoaXMuX2VtaXR0ZXJ9XG4vL31cblxuZXhwb3J0IGRlZmF1bHQgbmV3IE1hbmFnZXIoKSIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5pbXBvcnQgbWFuYWdlciBmcm9tICcuL01hbmFnZXInXG5cbmNvbnN0XG4gICAgbm9kZSA9IHtcbiAgICAgICAgLy9idXMsXG4gICAgICAgIC8vbmFtZSxcbiAgICAgICAgLy9zZXJ2ZXIsXG4gICAgICAgIGNvbm5lY3Rpb25zOiBbdW5kZWZpbmVkXSxcbiAgICAgICAgb2JqZWN0czoge30sXG4gICAgICAgIHJlcWlkOiAwLFxuICAgICAgICByZXF1ZXN0czoge30sXG4gICAgICAgIHNpZ25hbHM6IG5ldyBFdmVudEVtaXR0ZXIoKVxuICAgIH0sXG4gICAgYWRkQ2hpbGQgPSBjaGlsZCA9PiB7XG4gICAgICAgIGNoaWxkLmlkID0gbm9kZS5jb25uZWN0aW9ucy5sZW5ndGhcbiAgICAgICAgY2hpbGQubmFtZSA9IGAke25vZGUubmFtZX0ke2NoaWxkLmlkfWBcbiAgICAgICAgY29uc29sZS5sb2coYCR7bm9kZS5uYW1lfSBhZGRpbmcgY2hpbGQgJHtjaGlsZC5uYW1lfWApXG4gICAgICAgIG5vZGUuY29ubmVjdGlvbnMucHVzaChjaGlsZClcbiAgICAgICAgY2hpbGQuc2VuZCh7aGVsbG86IGAke2NoaWxkLm5hbWV9L2B9KVxuICAgIH0sXG4gICAgc3RhcnRTZXJ2ZXIgPSBjb250ZXh0ID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIG5vZGUuc2VydmVyID0gQ29ubmVjdGlvbi5jcmVhdGVTZXJ2ZXIoY29udGV4dC5jaGlsZHJlbilcbiAgICAgICAgICAgICAgICAub24oJ2Nvbm5lY3Rpb24nLCBjb25uZWN0aW9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2hpbGQoYmluZChjb25uZWN0aW9uKSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2VydmVyIGVycm9yJywgZXJyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJvdXRlID0gbiA9PiB7XG4gICAgICAgIGxldCBpID0gbi5sYXN0SW5kZXhPZignLycpXG4gICAgICAgIGlmIChpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG5hbWUnKVxuICAgICAgICBsZXRcbiAgICAgICAgICAgIHBhdGggPSBuLnNsaWNlKDAsIGkgKyAxKSxcbiAgICAgICAgICAgIHIgPSBwYXRoID09PSBub2RlLm5hbWUgPyBudWxsXG4gICAgICAgICAgICAgICAgOiBwYXRoLnN0YXJ0c1dpdGgoKG5vZGUubmFtZSkpID8gbm9kZS5jb25uZWN0aW9uc1twYXJzZUludChwYXRoLnNsaWNlKG5vZGUubmFtZS5sZW5ndGgpKV1cbiAgICAgICAgICAgICAgICA6IG5vZGUuY29ubmVjdGlvbnNbMF1cbiAgICAgICAgLy9jb25zb2xlLmxvZyhgcm91dGluZyB0byAke3BhdGh9IGZyb20gJHtub2RlLm5hbWV9IHJldHVybnMgJHtyICYmIHIubmFtZX1gKVxuICAgICAgICByZXR1cm4gclxuICAgIH0sXG4gICAgYmluZCA9IGNvbm4gPT4ge1xuICAgICAgICByZXR1cm4gY29ublxuICAgICAgICAgICAgLm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgZGF0YSBmcm9tICR7Y29ubi5uYW1lfWAsIGRhdGEpXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoZGF0YS5yZXEpLnRoZW4oXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBseSh7aWQ6IGRhdGEucmVxLmlkLCBwYXRoOiBkYXRhLnJlcS5zZW5kZXIsIGFyZ3M6IHJlc30pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEucmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcGx5KGRhdGEucmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgc2lnbmFsKGRhdGEuc2lnLCBjb25uLmlkKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjb25uZWN0aW9uIGNsb3NlICR7Y29ubi5uYW1lfWApXG4gICAgICAgICAgICAgICAgbm9kZS5jb25uZWN0aW9uc1tjb25uLmlkXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgfSlcbiAgICB9LFxuICAgIHJlcXVlc3QgPSByZXEgPT4ge1xuICAgICAgICBsZXQgY29ubiA9IHJvdXRlKHJlcS5wYXRoKVxuICAgICAgICBpZiAoY29ubikge1xuICAgICAgICAgICAgaWYgKHJlcS5zZW5kZXIpXG4gICAgICAgICAgICAgICAgY29ubi5zZW5kKHtyZXF9KVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNlbmRlciA9IG5vZGUubmFtZVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgociwgaikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXEuaWQgPSBub2RlLnJlcWlkKytcbiAgICAgICAgICAgICAgICAgICAgY29ubi5zZW5kKHtyZXF9KVxuICAgICAgICAgICAgICAgICAgICBub2RlLnJlcXVlc3RzW3JlcS5pZF0gPSB7ciwgaiwgcmVxfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29ubiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgbGV0IG9iaiA9IG5vZGUub2JqZWN0c1tyZXEuaW50ZXJmYWNlXSAmJiBub2RlLm9iamVjdHNbcmVxLmludGVyZmFjZV0ub2JqXG4gICAgICAgICAgICBpZiAoIW9iaikgcmV0dXJuIFByb21pc2UucmVqZWN0KGBFcnJvciBpbnRlcmZhY2UgJHtyZXEuaW50ZXJmYWNlfSBvYmplY3Qgbm90IGZvdW5kYClcbiAgICAgICAgICAgIGxldCBtZW1iZXIgPSBvYmpbcmVxLm1lbWJlcl0sIGFyZ3MgPSByZXEuYXJncyAvLyB3b3JrYXJvdW5kIHVnbGlmeSBwYXJzZSBlcnJvclxuICAgICAgICAgICAgaWYgKCFtZW1iZXIpIHJldHVybiBQcm9taXNlLnJlamVjdChgRXJyb3IgbWVtYmVyICR7cmVxLm1lbWJlcn0gbm90IGZvdW5kYClcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShvYmpbcmVxLm1lbWJlcl0oLi4uYXJncykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChgRXhjZXB0aW9uIGNhbGxpbmcgaW50ZXJmYWNlICR7cmVxLmludGVyZmFjZX0gb2JqZWN0IG1lbWJlciAke3JlcS5tZW1iZXJ9ICR7ZX1gKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbm4gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnY29ubmVjdGlvbiBlcnJvcicpIC8vIFRPRE9cbiAgICB9LFxuICAgIHJlcGx5ID0gcmVzID0+IHtcbiAgICAgICAgbGV0IGNvbm4gPSByb3V0ZShyZXMucGF0aClcbiAgICAgICAgaWYgKGNvbm4pXG4gICAgICAgICAgICBjb25uLnNlbmQoe3Jlc30pXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IHIgPSBub2RlLnJlcXVlc3RzW3Jlcy5pZF1cbiAgICAgICAgICAgIGRlbGV0ZSBub2RlLnJlcXVlc3RzW3Jlcy5pZF1cbiAgICAgICAgICAgIHIucihyZXMuYXJncylcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2lncm91dGUgPSAobmFtZSwgZnJvbSkgPT4ge1xuICAgICAgICBsZXQgciA9IG5vZGUuY29ubmVjdGlvbnMuZmlsdGVyKGMgPT4gYyAmJiBjLmlkICE9PSBmcm9tKVxuICAgICAgICAvL2NvbnNvbGUubG9nKGBzaWdyb3V0aW5nICR7bmFtZX0gZnJvbSAke2Zyb219IHJldHVybnMgJHtyLm1hcChjID0+IGMuaWQpfWApXG4gICAgICAgIHJldHVybiByXG4gICAgfSxcbiAgICBzaWduYWwgPSAoc2lnLCBmcm9tKSA9PiB7XG4gICAgICAgIG5vZGUuc2lnbmFscy5lbWl0KHNpZy5uYW1lLCBzaWcuYXJncylcbiAgICAgICAgc2lncm91dGUoc2lnLm5hbWUsIGZyb20pLmZvckVhY2goYyA9PiBjICYmIGMuc2VuZCh7c2lnfSkpXG4gICAgfSxcbiAgICBtZXRob2RzID0gb2JqID0+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopKVxuICAgICAgICAgICAgLmZpbHRlcihwID0+XG4gICAgICAgICAgICB0eXBlb2Ygb2JqW3BdID09PSAnZnVuY3Rpb24nICYmIHAgIT09ICdjb25zdHJ1Y3RvcicpXG4gICAgfSxcbiAgICBjbG9zZSA9ICgpID0+IHtcbiAgICB9LFxuICAgIGluaXRNYW5hZ2VyID0gYnVzID0+IG1hbmFnZXIuaW5pdChidXMsIHtcbiAgICAgICAgbm9kZSwgcmVxdWVzdCwgc2lnbmFsLCAvLyBUT0RPXG4gICAgfSlcblxudmFyIENvbm5lY3Rpb25cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGdldCBidXMgKCkge3JldHVybiBub2RlLmJ1c30sXG4gICAgc2V0IGJ1cyAoYikge25vZGUuYnVzID0gYn0sXG5cbiAgICBzZXQgQ29ubmVjdGlvbiAoYykge0Nvbm5lY3Rpb24gPSBjfSxcblxuICAgIGNvbm5lY3Rpb25zOiBub2RlLmNvbm5lY3Rpb25zLFxuXG4gICAgZ2V0IG5hbWUgKCkge3JldHVybiBub2RlLm5hbWV9LFxuICAgIHNldCBuYW1lIChuKSB7bm9kZS5uYW1lID0gbn0sXG5cbiAgICBvYmplY3RzOiBub2RlLm9iamVjdHMsXG4gICAgc2lnbmFsczogbm9kZS5zaWduYWxzLFxuXG4gICAgYWRkQ2hpbGQsXG4gICAgc3RhcnRTZXJ2ZXIsXG4gICAgcm91dGUsXG4gICAgYmluZCxcbiAgICByZXF1ZXN0LFxuICAgIHJlcGx5LFxuICAgIHNpZ3JvdXRlLFxuICAgIHNpZ25hbCxcbiAgICBjbG9zZSxcbiAgICBpbml0TWFuYWdlclxufSIsIi8qXG4gQ29weXJpZ2h0IChDKSAyMDE2IFRoZWF0ZXJzb2Z0XG5cbiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBBZmZlcm8gR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgdmVyc2lvbiAzLlxuXG4gVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBHTlUgQWZmZXJvIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBBZmZlcm8gR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS4gSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+XG5cbiAqL1xuXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyJ1xuaW1wb3J0IG5vZGUgZnJvbSAnLi9ub2RlJ1xuXG5jb25zdCBFeGVjdXRvciA9IChfciwgX2opID0+ICh7XG4gICAgcHJvbWlzZTogbmV3IFByb21pc2UoKHIsIGopID0+IHtfciA9IHI7IF9qID0gan0pLFxuICAgIHJlc29sdmU6IHYgPT4gX3IodiksXG4gICAgcmVqZWN0OiBlID0+IF9qKGUpXG59KVxubGV0IGJ1c0V4ZWN1dG9yID0gRXhlY3V0b3IoKVxuXG5jbGFzcyBCdXMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIHN0YXRpYyBzdGFydCAoKSB7XG4gICAgICAgIGlmIChDb25uZWN0aW9uICYmICFub2RlLmJ1cykge1xuICAgICAgICAgICAgbGV0IGJ1cyA9IG5ldyBCdXMoQ29ubmVjdGlvbi5jb250ZXh0KVxuICAgICAgICAgICAgICAgIC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5idXMgPSBidXNcbiAgICAgICAgICAgICAgICAgICAgYnVzRXhlY3V0b3IucmVzb2x2ZShidXMpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVzRXhlY3V0b3IucHJvbWlzZVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yIChjb250ZXh0KSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgaWYgKCFjb250ZXh0KSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYnVzIGNvbnRleHQnKVxuICAgICAgICBpZiAoY29udGV4dC5wYXJlbnQpIHtcbiAgICAgICAgICAgIGxldCBjb25uID0gbm9kZS5iaW5kKENvbm5lY3Rpb24uY3JlYXRlUGFyZW50Q29ubmVjdGlvbihjb250ZXh0LnBhcmVudClcbiAgICAgICAgICAgICAgICAub24oJ29wZW4nLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJlbnQgb3BlbicpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaGVsbG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBidXMgbmFtZSBpcyAke2RhdGEuaGVsbG99YClcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IGRhdGEuaGVsbG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm4ubmFtZSA9IGAke25vZGUubmFtZX0wYFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5pbml0TWFuYWdlcigpXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0YXJ0U2VydmVyKGNvbnRleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcmVudCBlcnJvcicsIGVycilcbiAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIGNvbm4uaWQgPSAwXG4gICAgICAgICAgICBub2RlLmNvbm5lY3Rpb25zWzBdID0gY29ublxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbm9kZS5yb290ID0gdHJ1ZVxuICAgICAgICAgICAgbm9kZS5uYW1lID0gJy8nXG4gICAgICAgICAgICBub2RlLmluaXRNYW5hZ2VyKClcbiAgICAgICAgICAgIG5vZGUuc3RhcnRTZXJ2ZXIoY29udGV4dClcbiAgICAgICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiB0aGlzLmVtaXQoJ2Nvbm5lY3QnKSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBuYW1lICgpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubmFtZVxuICAgIH1cblxuICAgIHJlZ2lzdGVyT2JqZWN0IChuYW1lLCBvYmosIGlmYWNlID0gKG1ldGhvZHMob2JqKSkpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHJlZ2lzdGVyT2JqZWN0ICR7bmFtZX0gYXQgJHtub2RlLm5hbWV9IGludGVyZmFjZWAsIGlmYWNlKVxuICAgICAgICBub2RlLm9iamVjdHNbbmFtZV0gPSB7b2JqLCBpZmFjZX1cbiAgICB9XG5cbiAgICB1bnJlZ2lzdGVyT2JqZWN0ICgpIHtcbiAgICAgICAgLy9UT0RPXG4gICAgfVxuXG4gICAgcmVxdWVzdCAobmFtZSwgLi4uYXJncykge1xuICAgICAgICBjb25zb2xlLmxvZygncmVxdWVzdCcsIG5hbWUsIGFyZ3MpXG4gICAgICAgIGNvbnN0IFssIHBhdGgsIGlmYWNlLCBtZW1iZXJdID0gL14oWy9cXGRdKykoXFx3KykuKFxcdyspJC8uZXhlYyhuYW1lKVxuICAgICAgICByZXR1cm4gbm9kZS5yZXF1ZXN0KHtwYXRoLCBpbnRlcmZhY2U6IGlmYWNlLCBtZW1iZXIsIGFyZ3N9KVxuICAgICAgICAgICAgLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGByZXF1ZXN0ICR7bmFtZX0gcmVqZWN0ZWQgJHtlfWApXG4gICAgICAgICAgICAgICAgdGhyb3cgZVxuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBzaWduYWwgKG5hbWUsIGFyZ3MpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnc2lnbmFsJywgbmFtZSwgYXJncylcbiAgICAgICAgY29uc3QgWywgcGF0aCwgaWZhY2UsIG1lbWJlcl0gPSAvXihbL1xcZF0rKShcXHcrKS4oXFx3KykkLy5leGVjKG5hbWUpXG4gICAgICAgIHJldHVybiBub2RlLnNpZ25hbCh7bmFtZSwgcGF0aCwgaW50ZXJmYWNlOiBpZmFjZSwgbWVtYmVyLCBhcmdzfSlcbiAgICB9XG5cbiAgICByZWdpc3Rlckxpc3RlbmVyIChuYW1lLCBjYikge1xuICAgICAgICAvL2NvbnN0IFssIHBhdGgsIGlmYWNlLCBtZW1iZXJdID0gL14oWy9cXGRdKykoXFx3KykuKFxcdyspJC8uZXhlYyhuYW1lKVxuICAgICAgICAvL1RPRE9cbiAgICAgICAgbm9kZS5zaWduYWxzLm9uKG5hbWUsIGNiKVxuICAgIH1cblxuICAgIHVucmVnaXN0ZXJMaXN0ZW5lciAoKSB7XG4gICAgICAgIC8vVE9ET1xuICAgIH1cblxuICAgIGNsb3NlICgpIHtcbiAgICAgICAgbm9kZS5jbG9zZVxuICAgIH1cbn1cblxudmFyIENvbm5lY3Rpb24gLy9zZXRDb25uZWN0aW9uXG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBzZXQgY29ubmVjdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKENvbm5lY3Rpb24pIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNoYW5nZSBDb25uZWN0aW9uJylcbiAgICAgICAgQ29ubmVjdGlvbiA9IG5vZGUuQ29ubmVjdGlvbiA9IHZhbHVlXG4gICAgfSxcbiAgICBzdGFydCAoY29ubmVjdGlvbikge1xuICAgICAgICBpZiAoY29ubmVjdGlvbilcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb25cbiAgICAgICAgcmV0dXJuIEJ1cy5zdGFydCgpXG4gICAgfSxcbiAgICBnZXQgYnVzICgpIHtcbiAgICAgICAgaWYgKCFub2RlLmJ1cykgdGhyb3cgbmV3IEVycm9yKCdCdXMgbm90IHN0YXJ0ZWQnKVxuICAgICAgICByZXR1cm4gbm9kZS5idXNcbiAgICB9LFxuICAgIHByb3h5IChpZmFjZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHt9LCB7XG4gICAgICAgICAgICBnZXQgKF8sIG5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKC4uLmFyZ3MpID0+XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVxdWVzdCh7cGF0aDogJy8nLCBpbnRlcmZhY2U6IGlmYWNlLCBtZW1iZXI6IG5hbWUsIGFyZ3N9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cbiIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXInXG5cbmNsYXNzIENvbm5lY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yICh3cykge1xuICAgICAgICBzdXBlcigpXG4gICAgICAgIHRoaXMud3MgPSB3c1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpc1xuICAgICAgICB3cy5vbm9wZW4gPSAoKSA9PlxuICAgICAgICAgICAgc2VsZi5lbWl0KCdvcGVuJylcbiAgICAgICAgd3Mub25tZXNzYWdlID0gZXYgPT5cbiAgICAgICAgICAgIHNlbGYuZW1pdCgnZGF0YScsIEpTT04ucGFyc2UoZXYuZGF0YSkpXG4gICAgICAgIHdzLm9uY2xvc2UgPSBldiA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGlvbiBjbG9zZScsIHRoaXMubmFtZSlcbiAgICAgICAgICAgIHNlbGYuZW1pdCgnY2xvc2UnKVxuICAgICAgICB9XG4gICAgICAgIHdzLm9uZXJyb3IgPSBldiA9PlxuICAgICAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGV2KVxuICAgIH1cbiAgICBzZW5kIChkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBjb25uZWN0aW9uICR7dGhpcy5uYW1lfSBzZW5kYCwgZGF0YSlcbiAgICAgICAgdGhpcy53cy5zZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKVxuICAgIH1cbn1cblxubGV0IGNvbnRleHRcblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGNyZWF0ZVBhcmVudENvbm5lY3Rpb24gKHBhcmVudCkge1xuICAgICAgICByZXR1cm4gbmV3IENvbm5lY3Rpb24obmV3IFdlYlNvY2tldChwYXJlbnQudXJsKSlcbiAgICB9LFxuICAgIGNyZWF0ZVNlcnZlciAoe2hvc3QsIHBvcnQsIHNlcnZlcn0pIHtcbiAgICAgICAgdGhyb3cgKCdub3QgaW1wbGVtZW50ZWQnKVxuICAgIH0sXG4gICAgY3JlYXRlIChjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHRcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9LFxuICAgIHNldCBjb250ZXh0ICh2YWx1ZSkge1xuICAgICAgICBpZiAoY29udGV4dCkgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgY2hhbmdlIGNvbnRleHQnKVxuICAgICAgICBjb250ZXh0ID0gdmFsdWVcbiAgICB9LFxuICAgIGdldCBjb250ZXh0ICgpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQgfHwge3BhcmVudDoge3VybDogYCR7bG9jYXRpb24ucHJvdG9jb2wgPT09J2h0dHBzOicgPyAnd3NzJyA6ICd3cyd9Oi8vJHtsb2NhdGlvbi5ob3N0fWB9fVxuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJDb25uZWN0aW9uIiwibWV0aG9kcyIsIm1hbmFnZXIiLCJub2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLFlBQVksQ0FBQztJQUNmLFdBQVcsQ0FBQyxHQUFHO1FBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRTtLQUMxQjtJQUNELFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7UUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ3BDLE9BQU8sSUFBSTtLQUNkOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFxQkQsSUFBSSxDQUFDLENB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

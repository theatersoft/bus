/*
 Copyright (C) 2016 Theatersoft

 This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3.

 This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with this program. If not, see <http://www.gnu.org/licenses/>

*/
'use strict'

const
    EventEmitter = require('./EventEmitter'),
    manager = require('./Manager').manager,
    node = {
        //name,
        //server,
        connections: [undefined],
        objects: {},
        reqid: 0,
        requests: {},
        signals: new EventEmitter()
    },
    addChild = child => {
        child.id = node.connections.length
        child.name = `${node.name}${child.id}`
        console.log(`${node.name} adding child ${child.name}`)
        node.connections.push(child)
        child.send({hello: `${child.name}/`})
    },
    startServer = context => {
        if (context.children) {
            node.server = Connection.createServer(context.children)
                .on('connection', connection => {
                    addChild(bind(connection))
                })
                .on('error', err => {
                    console.log('server error', err)
                })
        }
    },
    route = n => {
        let i = n.lastIndexOf('/')
        if (i === -1) throw new Error('Invalid name')
        let
            path = n.slice(0, i + 1),
            r = path === node.name ? null
                : path.startsWith((node.name)) ? node.connections[parseInt(path.slice(node.name.length))]
                    : node.connections[0]
        //console.log(`routing to ${path} from ${node.name} returns ${r && r.name}`)
        return r
    },
    bind = conn => {
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
    },
    request = req => {
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
    },
    reply = res => {
        let conn = route(res.path)
        if (conn)
            conn.send({res})
        else {
            let r = node.requests[res.id]
            delete node.requests[res.id]
            r.r(res.args)
        }
    },
    sigroute = (name, from) => {
        let r = node.connections.filter(c => c && c.id !== from)
        //console.log(`sigrouting ${name} from ${from} returns ${r.map(c => c.id)}`)
        return r
    },
    signal = (sig, from) => {
        node.signals.emit(sig.name, sig.args)
        sigroute(sig.name, from).forEach(c => c && c.send({sig}))
    },
    methods = obj => {
        return Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
            .filter(p =>
                typeof obj[p] === 'function' && p !== 'constructor')
    },
    close = () => {
    },
    proxy = iface => Proxy.create({
        get (target, name) {
            return (...args) =>
                request({path: '/', interface: iface, member: name, args})
        }
    }),
    initManager = bus => manager.init(bus, {
        node, request, signal, // TODO
    })

const Executor = (_r, _j) => ({
    promise: new Promise((r, j) => {_r = r; _j = j}),
    resolve: v => _r(v),
    reject: e => _j(e)
})
let busExecutor = Executor()

class Bus extends EventEmitter {
    static start () {
        if (Connection && !node.bus) {
            let bus = new Bus(Connection.context)
                .on('connect', () => {
                    node.bus = bus
                    busExecutor.resolve(bus)
                })
        }
        return busExecutor.promise
    }
    constructor (context) {
        super()
        if (!context) throw new Error('Invalid bus context')
        if (context.parent) {
            let conn = bind(Connection.createParentConnection(context.parent)
                .on('open', () => {
                    console.log('parent open')
                })
                .on('data', data => {
                    if (data.hello) {
                        console.log(`bus name is ${data.hello}`)
                        node.name = data.hello
                        conn.name = `${node.name}0`
                        initManager()
                        startServer(context)
                        this.emit('connect')
                    }
                })
                .on('error', err => {
                    console.log('parent error', err)
                }))
            conn.id = 0
            node.connections[0] = conn
        } else {
            node.root = true
            node.name = '/'
            initManager()
            startServer(context)
            setImmediate(() => this.emit('connect'))
        }
    }
    get name () {
        return node.name
    }
    registerObject (name, obj, iface = (methods(obj))) {
        console.log(`registerObject ${name} at ${node.name} interface`, iface)
        node.objects[name] = {obj, iface}
    }
    unregisterObject () {
        //TODO
    }
    request (name, ...args) {
        console.log('request', name, args)
        const [, path, iface, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return request({path, interface: iface, member, args})
            .catch(e => {
                console.log(`request ${name} rejected ${e}`)
                throw e
            })
    }
    signal (name, args) {
        //console.log('signal', name, args)
        const [, path, iface, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return signal({name, path, interface: iface, member, args})
    }
    registerListener (name, cb) {
        //const [, path, iface, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        //TODO
        node.signals.on(name, cb)
    }
    unregisterListener () {
        //TODO
    }
    close () {
        node.close
    }
}

var Connection //setConnection

module.exports = {
    set connection (value) {
        if (Connection) throw new Error('Cannot change Connection')
        Connection = value
    },
    start (connection) {
        if (connection)
            this.connection = connection
        return Bus.start()
    },
    get bus () {
        if (!node.bus) throw new Error('Bus not started')
        return node.bus
    },
    proxy
}

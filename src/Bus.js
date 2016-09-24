/*
 Copyright (C) 2016 Theatersoft

 This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3.

 This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with this program. If not, see <http://www.gnu.org/licenses/>

 */

import EventEmitter from './EventEmitter'
import node from './node'

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
            let conn = node.bind(Connection.createParentConnection(context.parent)
                .on('open', () => {
                    console.log('parent open')
                })
                .on('data', data => {
                    if (data.hello) {
                        console.log(`bus name is ${data.hello}`)
                        node.name = data.hello
                        conn.name = `${node.name}0`
                        node.initManager()
                        node.startServer(context)
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
            node.initManager()
            node.startServer(context)
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
        return node.request({path, interface: iface, member, args})
            .catch(e => {
                console.log(`request ${name} rejected ${e}`)
                throw e
            })
    }

    signal (name, args) {
        //console.log('signal', name, args)
        const [, path, iface, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.signal({name, path, interface: iface, member, args})
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

export default {
    set connection (value) {
        if (Connection) throw new Error('Cannot change Connection')
        Connection = node.Connection = value
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
    proxy (iface) {
        return new Proxy({}, {
            get (_, name) {
                return (...args) =>
                    node.request({path: '/', interface: iface, member: name, args})
            }
        })
    }
}

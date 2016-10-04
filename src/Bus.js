import EventEmitter from './EventEmitter'
import node from './node'
import manager from './manager'

let Connection

export function setConnection (value) {
    if (Connection) throw new Error('Cannot change Connection')
    Connection = node.Connection = value
}

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
                        this.name = data.hello
                        conn.name = `${this.name}0`
                        node.init(this)
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
            this.name = '/'
            node.init(this)
            node.startServer(context)
            setImmediate(() => this.emit('connect'))
        }
    }

    registerObject (name, obj, intf) {
        return manager.addName(name, this.name)
            .then(() =>
                node.registerObject(name, obj, intf)
            )
    }

    unregisterObject () {
        //TODO
    }

    request (name, ...args) {
        console.log('request', name, args)
        const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.request({path, intf, member, args})
            .catch(e => {
                console.log(`request ${name} rejected ${e}`)
                throw e
            })
    }

    signal (name, args) {
        //console.log('signal', name, args)
        const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.signal({name, path, intf, member, args})
    }

    registerListener (name, cb) {
        //const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
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

export default {
    start (context) {
        Connection.create(context)
        return Bus.start()
    },
    get bus () {
        if (!node.bus) throw new Error('Bus not started')
        return node.bus
    },
    proxy (name) {
        let [, path, intf] = /^([/\d]+)(\w+)$/.exec(name) || [undefined, undefined, name]
        return new Proxy({}, {
            get (_, member) {
                return (...args) =>
                    path ? Promise.resolve() : manager.resolveName(intf).then(p => {path = p})
                        .then(() =>
                            node.request({path, intf, member, args: [...args, node.name]}))
            }
        })
    }
}

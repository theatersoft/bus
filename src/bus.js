import node from './node'
import manager from './manager'
import {proxy} from './proxy'
import executor from './executor'
import connection from 'connection'
import {log, error} from './log'

let start = executor()

class Bus {
    start (context) {
        if (!start.started) {
            start.started = true
            connection.create(context)
                .then(() => {
                    if (connection.hasParent) {
                        const conn = connection.createParentConnection()
                            .on('open', () => {
                                log('parent open')
                            })
                            .on('close', () => {
                                log('parent close')
                            })
                            .on('connect', name => {
                                node.init(name, conn)
                                start.resolve(this)
                            })
                            .on('error', err => {
                                error('parent error', err)
                                start.reject(err)
                            })
                    } else {
                        node.init('/')
                        start.resolve(this)
                    }
                })
        }
        return start.promise
    }

    started () {return start.promise}

    get root () {return node.root}

    get name () {return node.name}

    get proxy () {return proxy}

    registerObject (name, obj, intf) {
        return manager.addName(name, this.name)
            .then(() =>
                node.registerObject(name, obj, intf))
            .then(() => ({
                signal: (member, args) =>
                    node.signal({name: `${name}.${member}`, args})
            }))
    }

    unregisterObject (name) {
        return manager.removeName(name, this.name)
            .then(() =>
                node.unregisterObject(name)
            )
    }

    request (name, ...args) {
        log('request', name, args)
        const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.request({path, intf, member, args})
            .catch(e => {
                error(`request ${name} rejected ${e}`)
                throw e
            })
    }

    signal (name, args) {
        throw 'deprecated'
        //log('signal', name, args)
        //const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        //return node.signal({name, path, intf, member, args})
    }

    registerListener (name, cb) {
        //const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        //TODO
        node.signals.on(name, cb)
    }

    unregisterListener (name, cb) {
        //TODO
        node.signals.off(name, cb)
    }

    on (type, cb) {
        node.status.on(type, cb)
        return this
    }

    off (type, cb) {
        node.status.off(type, cb)
    }

    close () {node.close()}
}

export default new Bus()
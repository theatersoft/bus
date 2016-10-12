import EventEmitter from './EventEmitter'
import node from './node'
import manager from './manager'
import {proxy} from './proxy'
import Connection from 'Connection'
import log from 'log'

let started

class Bus extends EventEmitter {
    start (context) {
        if (!started) {
            started = new Promise((resolve, reject) => {
                Connection.create(context)
                if (Connection.hasParent) {
                    let conn = node.bind(Connection.createParentConnection()
                        .on('open', () => {
                            log.log('parent open')
                        })
                        .on('data', data => {
                            if (data.hello) {
                                this.name = data.hello
                                conn.name = `${this.name}0`
                                node.init(this)
                                conn.registered = true
                                node.startServer()
                                resolve(this)
                            }
                        })
                        .on('error', err => {
                            log.error('parent error', err)
                            reject(err)
                        }))
                    node.addParent(conn)
                } else {
                    this.name = '/'
                    node.init(this)
                    node.startServer(context)
                    resolve(this)
                }
            })
        }
        return started
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
        log.log('request', name, args)
        const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.request({path, intf, member, args})
            .catch(e => {
                log.error(`request ${name} rejected ${e}`)
                throw e
            })
    }

    signal (name, args) {
        //log.log('signal', name, args)
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

export default new Bus()
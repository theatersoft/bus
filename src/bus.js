import node from './node'
import manager from './manager'
import {proxy, methods} from './proxy'
import executor from './executor'
import connection from 'connection'
import {debug, log, error} from './log'
import type {Context, Listener, Executor, Connection, BusObject} from './types'

let
    start :Executor<Bus> = executor(),
    _started :boolean

class Bus {
    start (context :Context) {
        if (!_started) {
            _started = true
            connection.create(context)
                .then(() => {
                    if (connection.hasParent) {
                        const conn :Connection = connection.createParentConnection()
                            .on('open', () => {
                                debug('parent open')
                            })
                            .on('close', () => {
                                debug('parent close')
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

    get root () :boolean {return node.root}

    get name () :string {return node.name}

    get proxy () :any {return proxy}

    registerObject (name :string, obj :any, intf :string[], meta :any) :Promise<BusObject> {
        return (isBusName(name) ? manager.addName(name, this.name) : Promise.resolve())
            .then(() => {
                node.registerObject(name, obj, intf, node.root ? meta : undefined)
                return {
                    signal: (member :string, args :mixed[]) =>
                        node._signal({name: `${name}.${member}`, args})
                }
            })
    }

    unregisterObject (name :string) :Promise<void> {
        return (isBusName(name) ? manager.removeName(name, this.name) : Promise.resolve())
            .then(() => {
                node.unregisterObject(name)
            })
    }

    request (name :string, ...args :mixed[]) {
        log('request', name, args)
        const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.request({path, intf, member, args})
            .catch(e => {
                error(`request ${name} rejected ${e}`)
                throw e
            })
    }

    registerListener (name :string, cb :Listener) {
        node.signals.on(name, cb)
    }

    unregisterListener (name :string, cb :Listener) {
        node.signals.off(name, cb)
    }

    on (type :string, cb :Listener) {
        node.status.on(type, cb)
        return this
    }

    off (type :string, cb :Listener) {
        node.status.off(type, cb)
    }

    close () {node.close()}

    introspectNode (path :string) {
        return node.introspect(path)
    }

    resolveName (name :string) {
        return manager.resolveName(name)
    }
}

export default new Bus()

export const isBusName = (name :string) => name.charAt(0).toUpperCase() === name.charAt(0)
import bus from './bus'
import EventEmitter from './EventEmitter'
import manager from './manager'
import {methods} from './proxy'
import connection from 'connection'
import {log, error} from 'log'

class Node {
    constructor () {
        this.conns = [undefined]
        this.objects = {}
        this.reqid = 0
        this.requests = {}
        this.signals = new EventEmitter()
    }

    init (name, parent) {
        log('node.init', name)
        if (parent) {
            parent.id = 0
            parent.registered = true
            this.conns[0] = this.bind(parent)
        }
        this.name = name
        this.root = name === '/'
        manager.init(name)

        if (!this.server && connection.hasChildren) {
            connection.createServer()
                .then(server => {
                    this.server = server
                        .on('child', conn => {
                            this.addChild(this.bind(conn))
                        })
                        .on('error', err => {
                            error('server error', err.message)
                        })
                })
        }
    }

    addChild (conn) {
        conn.id = this.conns.length
        conn.name = `${this.name}${conn.id}`
        log(`${this.name} adding child ${conn.name}`)
        conn.hello()
        this.conns.push(conn)
        conn.registered = true
    }

    route (n) {
        let i = n.lastIndexOf('/')
        if (i === -1) throw new Error('Invalid name')
        let
            path = n.slice(0, i + 1),
            r = path === this.name ? null
                : path.startsWith((this.name)) ? this.conns[parseInt(path.slice(this.name.length))]
                : this.conns[0]
        //log(`routing to ${path} from ${this.name} returns ${r && r.name}`)
        return r
    }

    bind (conn) {
        return conn
            .on('data', data => {
                //log(`data from ${conn.name}`, data)
                if (data.req)
                    this._request(data.req)
                else if (data.res)
                    this.response(data.res)
                else if (data.sig)
                    this.signal(data.sig, conn.id)
            })
            .on('close', () => {
                log(`connection close ${conn.name}`)
                if (!conn.registered) {
                    log('connection was not registered')
                    return
                }
                this.conns[conn.id] = undefined
                if (conn.id === 0)
                    this.reconnect(1000)
                else
                    Promise.resolve()
                        .then(() => manager.removeNode(`${conn.name}/`))
                        .catch(e => log('manager.removeNode rejected', e))
            })
    }

    reconnect (ms) {
        setTimeout(() => {
            const conn = connection.createParentConnection()
                .on('open', () => {
                    log('reconnect parent open')
                })
                .on('close', () => {
                    log('reconnect parent close')
                })
                .on('connect', name => {
                    this.init(name, conn)
                    Object.keys(this.objects).forEach(name =>
                        manager.addName(name, this.name))
                })
                .on('error', err => {
                    error('reconnect parent error', err.message)
                    this.reconnect(Math.min(ms * 2, 32000))
                })
        }, ms)
    }

    request (req) {
        return new Promise((r, j) => {
            req.sender = this.name
            req.id = this.reqid++
            this.requests[req.id] = {r, j, req}
            this._request(req)
        })
    }

    _request (req) {
        const conn = this.route(req.path)
        if (conn) {
            conn.send({req})
        } else if (conn === null) {
            log('request', req)
            Promise.resolve()
                .then(() => {
                    const obj = this.objects[req.intf] && this.objects[req.intf].obj
                    if (!obj) throw `Error interface ${req.intf} object not found`
                    const member = obj[req.member]
                    if (!member) throw `Error member ${req.member} not found`
                    return obj[req.member](...req.args)
                })
                .then(
                    res =>
                        this.response({id: req.id, path: req.sender, res}),
                    err =>
                        this.response({id: req.id, path: req.sender, err}))
        } else {
            log('_request connection error', req)
        }
    }

    response (res) {
        const conn = this.route(res.path)
        if (conn)
            conn.send({res})
        else if (conn === null) {
            let {r, j, req} = this.requests[res.id]
            delete this.requests[res.id]
            log('response', req, res)
            if (res.hasOwnProperty('err')) j(res.err)
            else r(res.res)
        }
        else {
            error('connection error', res)
        }
    }

    signal (sig, from) {
        this.signals.emit(sig.name, sig.args)
        this.conns.filter(c => c && c.id !== from).forEach(c => {
            //log(`sigrouting ${name} from ${from} to ${c.id}`)
            c && c.send({sig})
        })
    }

    close () {
    }

    registerObject (name, obj, intf = (methods(obj))) {
        log(`registerObject ${name} at ${this.name} interface`, intf)
        this.objects[name] = {obj, intf}
    }
}

export default new Node()
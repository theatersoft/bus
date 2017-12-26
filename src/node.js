import bus from './bus'
import EventEmitter from './EventEmitter'
import manager from './manager'
import {methods} from './proxy'
import connection from 'connection'
import {debug, log, error} from './log'
import type {Request, Req, Res, Sig, Data, Connection, ObjectEntry} from './types'
import {nodeIntrospect} from './node.introspect'

const
    logRequest = (req: Req) => log(`  ${req.id}-> ${req.path}${req.intf}.${req.member}(`, ...req.args, `) from ${req.sender}`),
    logResponse = (req: Req, res:Res) => res.hasOwnProperty('err') ? error(`<-${req.id}  `, res.err, 'FAILED') : log(`<-${req.id}  `, res.res)

export class Node {
    name :string
    root :boolean
    closing :boolean
    server :any
    conns :Array<?Connection> = [undefined]
    objects :{[name :string] :ObjectEntry} = {}
    reqid = 0
    requests = {}
    signals = new EventEmitter()
    status = new EventEmitter()

    init (name :string, parent ?:Connection) :void {
        debug('node.init', name)
        this.objects['*'] = {obj: this}
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
                        .on('child', (conn:Connection) => {
                            this.addChild(this.bind(conn))
                        })
                        .on('error', (err: any) => {
                            error('server error', err.message)
                        })
                })
        }
    }

    addChild (conn :Connection) :void {
        conn.id = this.conns.length
        conn.name = `${this.name}${conn.id}`
        log(`${this.name} adding child ${conn.name}`)
        conn.hello()
        this.conns.push(conn)
        conn.registered = true
    }

    route (path :string) :?Connection {
        let i = path.lastIndexOf('/')
        if (i === -1) throw new Error('Invalid name')
        let
            p = path.slice(0, i + 1),
            r = p === this.name ? null
                : p.startsWith((this.name)) ? this.conns[parseInt(p.slice(this.name.length))]
                : this.conns[0]
        //log(`routing to ${path} from ${this.name} returns ${r && r.name}`)
        return r
    }

    bind (conn :Connection) :Connection {
        return conn
            .on('data', (data:Data) => {
                //debug(`data from ${conn.name}`, data)
                data.req ? this._request(data.req)
                    : data.res ? this._response(data.res)
                    : data.sig && this._signal(data.sig, conn.id)
            })
            .on('close', () => {
                log(`connection close ${conn.name}`)
                if (!conn.registered) {
                    log('connection was not registered')
                    return
                }
                this.conns[conn.id] = undefined
                if (conn.id === 0) {
                    debug('disconnected')
                    !this.closing && this.reconnect()
                } else
                    Promise.resolve()
                        .then(() => manager.removeNode(`${conn.name}/`))
                        .then(() => log(`connection removed ${conn.name}`))
                        .catch(e => log('manager.removeNode rejected', e))
            })
    }

    reconnect (ms :number = 1000) :void {
        this.status.emit('disconnect')
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
                    Object.keys(this.objects)
                        .filter(name => /^[A-Z]/.test(name))
                        .forEach(name => manager.addName(name, this.name))
                    this.status.emit('reconnect')
                    debug('reconnected')
                })
                .on('error', err => {
                    error('reconnect parent error', err.message)
                    this.reconnect(Math.min(ms * 2, 32000))
                })
        }, ms)
    }

    _request (req :Req) :void {
        logRequest(req)
        const conn = this.route(req.path)
        if (conn) {
            conn.send({req})
        } else if (conn === null) {
            Promise.resolve()
                .then(() => {
                    const
                        {intf, member, sender} = req,
                        info = this.objects[intf]
                    if (!info) throw `Error interface ${intf} object not found`
                    const {obj, meta = {}} = info
                    if (!obj[member]) throw `Error member ${member} not found`
                    let {args} = req
                    if (meta.sender) args = args.concat(sender)
                    return obj[member](...args)
                })
                .then(res => ({res}), err => ({err}))
                .then(result => {
                    const res = {id: req.id, path: req.sender, ...result}
                    this._response(res, req)
                })
        } else {
            log('_request connection error', req)
        }
    }

    _response (res :Res, req :?Req) :void {
        const conn = this.route(res.path)
        if (conn) {
            if (req) logResponse(req, res)
            conn.send({res})
        } else if (conn === null) {
            let {r, j, req} = this.requests[res.id]
            delete this.requests[res.id]
            logResponse(req, res)
            if (res.hasOwnProperty('err')) j(res.err)
            else r(res.res)
        }
        else {
            error('connection error', res)
        }
    }

    _signal (sig :Sig, from :?number) :void {
        this.signals.emit(sig.name, sig.args)
        this.conns.filter(c => c && c.id !== from).forEach(c => {
            //log(`sigrouting ${name} from ${from} to ${c.id}`)
            c && c.send({sig})
        })
    }

    request (request :Request) :Promise<mixed> {
        return new Promise((r, j) => {
            const req = {...request, sender: this.name, id: this.reqid++}
            this.requests[req.id] = {r, j, req}
            this._request(req)
        })
    }

    close () :void {
        this.closing = true
        this.conns.forEach(conn => conn && conn.close())
    }

    registerObject (name :string, obj :any, intf :string[], meta :any) :void {
        log(`registerObject ${name} at ${this.name} interface`, intf)
        this.objects[name] = {obj, intf, meta}
    }

    unregisterObject (name :string) :void {
        log(`unregisterObject ${name} at ${this.name}`)
        delete this.objects[name]
    }
}

export default new class extends nodeIntrospect(Node) {}()

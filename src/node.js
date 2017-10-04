//TODO @flow
import bus from './bus'
import EventEmitter from './EventEmitter'
import manager from './manager'
import {methods} from './proxy'
import connection from 'connection'
import {log, error} from './log'
import type {Connection} from 'connection'

const
    logRequest = (req:Req) => log(`  ${req.id}-> ${req.path}${req.intf}.${req.member}(`, ...req.args, `) from ${req.sender}`),
    logResponse = (req:Req, res:any) => res.hasOwnProperty('err') ? error(`<-${req.id}  `, res.err, 'FAILED') : log(`<-${req.id}  `, res.res)

type Request = {path:string, intf:string, member:string, args:Array<any>}
type Req = {path:string, intf:string, member:string, args:Array<any>, id:number, sender:string}
type Response = any
type Signal = any

class Node {
    name:string
    root:boolean
    closing:boolean
    server:any
    conns:Array<Connection> = [undefined]
    objects = {}
    reqid = 0
    requests = {}
    signals = new EventEmitter()
    status = new EventEmitter()

    init (name:string, parent:any) {
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

    addChild (conn:Connection) {
        conn.id = this.conns.length
        conn.name = `${this.name}${conn.id}`
        log(`${this.name} adding child ${conn.name}`)
        conn.hello()
        this.conns.push(conn)
        conn.registered = true
    }

    route (path:string) {
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

    bind (conn:Connection) {
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
                    !this.closing && this.reconnect()
                else
                    Promise.resolve()
                        .then(() => manager.removeNode(`${conn.name}/`))
                        .then(() => log(`connection removed ${conn.name}`))
                        .catch(e => log('manager.removeNode rejected', e))
            })
    }

    reconnect (ms:number = 1000) {
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
                    Object.keys(this.objects).forEach(name =>
                        manager.addName(name, this.name))
                    this.status.emit('reconnect')
                })
                .on('error', err => {
                    error('reconnect parent error', err.message)
                    this.reconnect(Math.min(ms * 2, 32000))
                })
        }, ms)
    }

    request (request:Request): Promise<mixed> {
        return new Promise((r, j) => {
            const req = {...request, sender: this.name, id: this.reqid++}
            this.requests[req.id] = {r, j, req}
            this._request(req)
        })
    }

    _request (req:Req) {
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
                .then(
                    res =>
                        this.response({id: req.id, path: req.sender, res}),
                    err =>
                        this.response({id: req.id, path: req.sender, err}))
        } else {
            log('_request connection error', req)
        }
    }

    response (res:Response) {
        const conn = this.route(res.path)
        if (conn)
            conn.send({res})
        else if (conn === null) {
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

    signal (sig:Signal, from:?string) {
        this.signals.emit(sig.name, sig.args)
        this.conns.filter(c => c && c.id !== from).forEach(c => {
            //log(`sigrouting ${name} from ${from} to ${c.id}`)
            c && c.send({sig})
        })
    }

    close () {
        this.closing = true
        this.conns.forEach(conn => conn.close())
    }

    registerObject (name:string, obj:any, intf:Array<string>, meta:any) {
        log(`registerObject ${name} at ${this.name} interface`, intf)
        this.objects[name] = {obj, intf, meta}
    }

    unregisterObject (name:string) {
        log(`unRegisterObject ${name} at ${this.name}`)
        delete this.objects[name]
    }
}

export default new Node()
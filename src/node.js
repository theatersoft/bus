import EventEmitter from './EventEmitter'
import manager from './manager'

let Connection

const methods = obj =>
    Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
        .filter(p =>
        typeof obj[p] === 'function' && p !== 'constructor')

class Node {
    set Connection (c) {Connection = c}

    constructor () {
        this.connections = [undefined]
        this.objects = {}
        this.reqid = 0
        this.requests = {}
        this.signals = new EventEmitter()
    }

    init (bus) {
        console.log('node.init', bus.name)
        this.bus = bus
        this.name = bus.name
        this.root = bus.name === '/'
        manager.init(this)
    }

    addChild (child) {
        child.id = this.connections.length
        child.name = `${this.name}${child.id}`
        console.log(`${this.name} adding child ${child.name}`)
        this.connections.push(child)
        child.send({hello: `${child.name}/`})
    }

    startServer (context) {
        if (context.children) {
            this.server = Connection.createServer(context.children)
                .on('connection', connection => {
                    this.addChild(this.bind(connection))
                })
                .on('error', err => {
                    console.log('server error', err)
                })
        }
    }

    route (n) {
        let i = n.lastIndexOf('/')
        if (i === -1) throw new Error('Invalid name')
        let
            path = n.slice(0, i + 1),
            r = path === this.name ? null
                : path.startsWith((this.name)) ? this.connections[parseInt(path.slice(this.name.length))]
                : this.connections[0]
        //console.log(`routing to ${path} from ${this.name} returns ${r && r.name}`)
        return r
    }

    bind (conn) {
        return conn
            .on('data', data => {
                //console.log(`data from ${conn.name}`, data)
                if (data.req)
                    this._request(data.req)
                else if (data.res)
                    this.response(data.res)
                else if (data.sig)
                    this.signal(data.sig, conn.id)
            })
            .on('close', () => {
                console.log(`connection close ${conn.name}`)
                this.connections[conn.id] = undefined
            })
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
            const
                res = res =>
                    this.response({id: req.id, path: req.sender, res}),
                err = err =>
                    this.response({id: req.id, path: req.sender, err}),
                obj = this.objects[req.intf] && this.objects[req.intf].obj
            if (!obj) err(`Error interface ${req.intf} object not found`)
            let member = obj[req.member]
            if (!member) err(`Error member ${req.member} not found`)
            Promise.resolve()
                .then(() => obj[req.member](...req.args))
                .then(res, err)
        }
        else
            throw('connection error') // TODO
    }

    response (res) {
        const conn = this.route(res.path)
        if (conn)
            conn.send({res})
        else if (conn === null) {
            let {r, j, req} = this.requests[res.id]
            delete this.requests[res.id]
            console.log('response', req, res)
            if (res.hasOwnProperty('err')) j(res.err)
            else r(res.res)
        }
        else
            throw('connection error') // TODO
    }

    signal (sig, from) {
        this.signals.emit(sig.name, sig.args)
        this.connections.filter(c => c && c.id !== from).forEach(c => {
            //console.log(`sigrouting ${name} from ${from} to ${c.id}`)
            c && c.send({sig})
        })
    }

    close () {
    }

    registerObject (name, obj, intf = (methods(obj))) {
        console.log(`registerObject ${name} at ${this.name} interface`, intf)
        this.objects[name] = {obj, intf}
    }
}

export default new Node()
import EventEmitter from './EventEmitter'
import manager from './manager'

let Connection

class Node {
    set Connection (c) {Connection = c}

    constructor () {
        //bus,
        //name,
        //server,
        this.connections = [undefined]
        this.objects = {}
        this.reqid = 0
        this.requests = {}
        this.signals = new EventEmitter()
    }

    init (name) {
        console.log('node.init', name)
        this.name = name
        this.root = name === '/'
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
                if (data.req) {
                    this.request(data.req).then(
                        res =>
                            this.reply({id: data.req.id, path: data.req.sender, args: res}),
                        err =>
                            console.log(err))
                } else if (data.res) {
                    this.reply(data.res)
                } else if (data.sig) {
                    this.signal(data.sig, conn.id)
                }
            })
            .on('close', () => {
                console.log(`connection close ${conn.name}`)
                this.connections[conn.id] = undefined
            })
    }

    request (req) {
        let conn = this.route(req.path)
        if (conn) {
            if (req.sender)
                conn.send({req})
            else {
                req.sender = this.name
                return new Promise((r, j) => {
                    req.id = this.reqid++
                    conn.send({req})
                    this.requests[req.id] = {r, j, req}
                })
            }
        } else if (conn === null) {
            let obj = this.objects[req.interface] && this.objects[req.interface].obj
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
    }

    reply (res) {
        let conn = this.route(res.path)
        if (conn)
            conn.send({res})
        else {
            let r = this.requests[res.id]
            delete this.requests[res.id]
            r.r(res.args)
        }
    }

    sigroute (name, from) {
        let r = this.connections.filter(c => c && c.id !== from)
        //console.log(`sigrouting ${name} from ${from} returns ${r.map(c => c.id)}`)
        return r
    }

    signal (sig, from) {
        this.signals.emit(sig.name, sig.args)
        this.sigroute(sig.name, from).forEach(c => c && c.send({sig}))
    }

    methods (obj) {
        return Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
            .filter(p =>
            typeof obj[p] === 'function' && p !== 'constructor')
    }

    close () {
    }
}

export default new Node()

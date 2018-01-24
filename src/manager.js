import node from './node'
import {proxy, methods} from './proxy'
import {log} from './log'
import connection from 'connection'

type Name = string
type Path = string

const
    dupNode = () => Promise.reject('duplicate node'),
    missingNode = () => Promise.reject('missing node'),
    dupName = () => Promise.reject('duplicate name'),
    missingName = () => Promise.reject('missing name')

class Manager {
    names :Map<Name, Path>
    nodes :Map<Path, Name[]>
    proxy :any

    init (path :Path) {
        //log(`manager.init as ${node.root ? 'root' : 'proxy'}`)
        if (node.root) {
            this.names = new Map()
            this.nodes = new Map()
            node.registerObject('Bus', this, methods(this), {sender: true})
        } else
            this.proxy = proxy('/Bus')
        this.addNode(path)
    }

    addNode (path :Path) :Promise<void> {
        if (this.proxy) return this.proxy.addNode(path)
        log('manager.addNode', path)
        if (this.nodes.has(path)) return dupNode()
        this.nodes.set(path, [])
        return Promise.resolve()
    }

    removeNode (path :Path) :Promise<void> {
        if (this.proxy) return this.proxy.removeNode(path)
        log('manager.removeNode', path)
        if (!this.nodes.has(path)) return missingNode()
        return Promise.all(
            (this.nodes.get(path) || [])
                .slice()
                .map(name =>
                    this.removeName(name)) // TODO remove children
        )
            .then(() => {
                this.nodes.delete(path)
            })
    }

    addName (name :Name, _sender :Path) :Promise<void> {
        if (this.proxy) return this.proxy.addName(name)
        log('manager.addName', name)
        if (this.names.has(name)) return dupName()
        this.names.set(name, _sender)
        const sender = this.nodes.get(_sender)
        if (!sender) return missingNode()
        sender.push(name)
        return Promise.resolve()
    }

    resolveName (name :Name) :Promise<Name | void> {
        if (this.proxy) return this.proxy.resolveName(name)
        if (!this.names.has(name)) return missingName()
        log('manager.resolveName', name, this.names.get(name))
        return Promise.resolve(this.names.get(name))
    }

    removeName (name :Name, _sender? :Path) :Promise<void> {
        if (this.proxy) return this.proxy.removeName(name)
        log('manager.removeName', name)
        if (!this.names.has(name)) return missingName()
        const path = this.names.get(name)
        if (!path) return missingName()
        this.names.delete(name)
        // TODO check path===_sender
        if (!this.nodes.has(path)) return missingNode()
        const names = this.nodes.get(path)
        if (!names) return missingName()
        const i = names.indexOf(name)
        if (i === -1) return missingName()
        names.splice(i, 1)
        return Promise.resolve()
    }

    check (auth :string) {
        const {children: {check} = {}} = connection.context
        return check(auth)
    }
}

export default new Manager()
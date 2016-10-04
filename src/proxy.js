import node from './node'
import manager from './manager'

export default function proxy (name) {
    let [, path, intf] = /^([/\d]+)(\w+)$/.exec(name) || [undefined, undefined, name]
    return new Proxy({}, {
        get (_, member) {
            return (...args) =>
                (path ? Promise.resolve() : manager.resolveName(intf).then(p => {path = p}))
                    .then(() =>
                        node.request({path, intf, member, args: [...args, node.name]}))
        }
    })
}
import node from './node'
import manager from './manager'
import {log, error} from './log'

export function proxy (name:string) {
    let [__, path, intf] = /^([/\d]+)(\w+)$/.exec(name) || [undefined, undefined, name]
    return new Proxy({}, {
        get (_, member) {
            return (...args) =>
                (path ? Promise.resolve() : manager.resolveName(intf).then(p => {path = p}))
                    .then(() =>
                        path
                            ? node.request({path, intf, member, args})
                            : error('Proxy interface not resolved')
                    )
        }
    })
}

export function methods (obj:any) {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
        .filter(p =>
        typeof obj[p] === 'function' && p !== 'constructor')
}

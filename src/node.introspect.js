import {Node} from './node'
import {proxy, methods} from './proxy'
import {type} from 'connection'

export const nodeIntrospect = (Base:Node) => class extends Base {
    introspect (path:string) {
        if (path !== this.name) return this.request({path, intf: '*', member: 'introspect', args: [path]})
        return {
            name: this.name,
            type,
            children: this.conns
                .filter((c, i) => i && c && c.name)
                .map(({name}) => `${name}/`),
            objects: Object.entries(this.objects)
                .filter(([k, v]) => k !== '*')
                .reduce((o, [k, {intf, meta}]) => (o[k] = {intf, meta}, o), {})
        }
    }
}
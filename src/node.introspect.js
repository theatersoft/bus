import {Node} from './node'
import {proxy, methods} from './proxy'
import {type} from 'connection'
import type {ObjectEntry, Connection} from './types'

export const nodeIntrospect = (Base :Class<Node>) => class extends Base {
    introspect (path :string) {
        if (path !== this.name) return this.request({path, intf: '*', member: 'introspect', args: [path]})
        return {
            name: this.name,
            type,
            children: this.conns
                .reduce((a, c, i) => (i && c && a.push(`${c.name}/`), a), []),
            objects: Object.entries(this.objects)
                .filter(([k] :[string, *]) => k !== '*')
                .reduce((o, [k, {intf, meta}] :[string, *]) => (o[k] = {intf, meta}, o), {})
        }
    }
}
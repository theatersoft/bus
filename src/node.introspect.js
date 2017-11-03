import {Node} from './node'
import {proxy, methods} from './proxy'

export const nodeIntrospect = (Base:Node) => class extends Base {
    introspect (path:string) {
        if (path !== this.name) return this.request({path, intf: '*', member: 'introspect', args: [path]})
        return {
            children: this.conns
                .filter((c, i) => i && c && c.name)
                .map(({name}) => name),
            objects: Object.keys(this.objects)
        }
    }
}
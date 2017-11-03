import {Node} from './node'

export const nodeIntrospect = (Base:Node) => class extends Base {
    introspect (path:string) {
        debugger
        if (path === this.name) {
            return {
                children: this.conns
                    //.filter((c, i) => i)
                    .map(({name}) => ({name}))
            }
        }
        return {}
    }
}
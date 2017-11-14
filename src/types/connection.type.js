export type Connection = any

export type Context = {
    parent?: Parent,
    children?: Children
}

export type ParentContext = {
    parent: Parent,
    children?: Children
}

export type ChildrenContext = {
    parent?: Parent,
    children: Children
}

type Parent = {
    url: string,
    auth?: string
}

type Children = {
    server: any,
    host: string,
    port: number,
    check: (string) => boolean
}

export type ObjectEntry = {
    obj: Object,
    intf?: [string],
    meta?: any
}
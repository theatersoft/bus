export type Connection = any

export type Context = {
    parent?: {
        url: string,
        auth?: string
    },
    children?: {
        server: any,
        host: string,
        port: number,
        check: (string) => boolean
    }
}

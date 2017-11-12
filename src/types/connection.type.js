//@flow

export type Connection = any

export type Context = {
    parent: {
        url: string
    },
    children: {
        server: any,
        host: string,
        port: number,
        check: (string) => boolean
    }
}

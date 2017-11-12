export * from './connection.type'
export * from './node.type'

export type Executor<T> ={
    promise: Promise<T>,
    resolve: (v:T) => void,
    reject: (e:any) => void
}

export type Listener = (...args:mixed[]) => void

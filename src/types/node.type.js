export type Listener = (...args :any[]) => void

export interface Connection {
    id :number;
    name :string;

    send (data :any) :void;

    close () :void;

    registered :boolean;

    hello () :void;

    on (type :string, callback :Listener) :Connection;
}

export type Request = {
    path :string,
    intf :string,
    member :string,
    args :mixed[]
}

export type Req = {
    path :string,
    intf :string,
    member :string,
    args :mixed[],
    id :number,
    sender :string
}

export type Res = {
    id :number,
    path :string,
    res? :mixed,
    err? :mixed
}

export type Sig = {
    name :string,
    args :mixed[]
}

export type Data = {| req :Req |} | {| res :Res |} | {| sig :Sig |}
declare var require: any;
declare var module: any;
declare const Bus: any;
declare class TestService {
    private _names;
    private bus;
    constructor();
    addName(name: any): void;
    getNames(): any;
    static test(): void;
}

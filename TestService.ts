'use strict'
declare var require
declare var module

const Bus = require('./src/Bus')

class TestService {
    private _names
    private bus

    constructor () {
        this._names = []
        //Bus.start().then(bus => {
        //    this.bus = bus
        //    setInterval(() => {
        //        this._names.forEach(name => bus.request(`${name}Local.ping`)
        //            .then(() =>
        //                console.log(`ping returned`))
        //            .catch(e =>
        //                console.log(`ping rejected ${e}`))
        //        )
        //    }, 2000)
        //})
    }
    addName (name) {
        console.log('TestService.addName')
        this._names.push(name)
    }
    getNames () {
        console.log('TestService.getNames')
        return this._names
    }
    static test () {
    }
}

module.exports = TestService

'use strict';
const bus = require('bus').bus;
class TestService {
    constructor () {
        this._names = [];
        setInterval(() => {
            for (let name of this._names) bus.request(`${name}Local.ping`)
                .then(() => console.log(`ping returned`), e => console.log(`ping rejected ${e}`))
        }, 2000)
    }

    addName (name) {
        console.log('TestService.addName');
        this._names.push(name);
    }

    getNames () {
        console.log('TestService.getNames');
        return this._names;
    }

    static test () {
    }
}
module.exports = TestService;
//# sourceMappingURL=TestService.js.map
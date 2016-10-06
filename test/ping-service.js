'use strict';
const
    Bus = require('@theatersoft/bus').default

class Ping {
    constructor (bus) {
    }

    ping () {
        console.log('Ping.ping')
        return 'ping'
    }
}

Bus.start().then(bus =>
    bus.registerObject('Ping', new Ping(bus))
        .catch(e => console.log(e))
)
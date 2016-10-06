'use strict';
const
    bus = require('@theatersoft/bus').default

class Ping {
    constructor (bus) {
    }

    ping () {
        console.log('Ping.ping')
        return 'ping'
    }
}

bus.start().then(() =>
    bus.registerObject('Ping', new Ping(bus))
        .catch(e => console.log(e))
)
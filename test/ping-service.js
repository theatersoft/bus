'use strict';
require('@theatersoft/bus').default.start({parent: {auth: 'TODO'}})
    .then(bus =>
        bus.registerObject('Ping', new Ping(bus)))
    .catch(e =>
        console.log(e))

class Ping {
    constructor (bus) {
    }

    ping () {
        console.log('Ping.ping')
        return 'ping'
    }
}
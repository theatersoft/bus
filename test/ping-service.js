'use strict';
const
    {Bus} = require('@theatersoft/bus')

class Ping {
    constructor (bus) {
        setInterval(() => {
        }, 2000)
        bus.registerObject('Ping', this)
    }

    ping () {
        console.log('Ping.ping');
    }
}

Bus.start().then(bus => new Ping(bus))
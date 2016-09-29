'use strict';
const
    {Bus} = require('@theatersoft/bus')

class Ping {
    constructor () {
        setInterval(() => {
        }, 2000)
        Bus.bus.register('Ping', this)
    }

    ping () {
        console.log('Ping.ping');
    }
}

Bus
    .start()
    .then(() => new Ping())
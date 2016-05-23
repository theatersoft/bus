'use strict';
const
    Bus = require('bus'),
    Connection = require('bus/src/Connection')

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
    .start(Connection.create())
    .then(() => new Ping())
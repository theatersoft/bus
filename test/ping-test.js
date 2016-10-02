'use strict'

const
    {Bus} = require('@theatersoft/bus'),
    Ping = Bus.proxy('Ping')

Bus.start()
    .then(() => {
        Ping.ping()
            .then(res =>
                console.log('1. Ping.ping returned', res))
            .catch(err =>
                console.log('1. Ping.ping rejected', err))

        Bus.proxy('Ping').ping()
            .then(res =>
                console.log('2. Ping.ping returned', res))
            .catch(err =>
                console.log('2. Ping.ping rejected', err))
    })
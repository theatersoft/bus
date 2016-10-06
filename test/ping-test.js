'use strict'

const
    {default: bus, proxy} = require('@theatersoft/bus'),
    Ping = proxy('Ping')

bus.start()
    .then(() => {
        Ping.ping()
            .then(res =>
                console.log('1. Ping.ping returned', res))
            .catch(err =>
                console.log('1. Ping.ping rejected', err))

        proxy('Ping').ping()
            .then(res =>
                console.log('2. Ping.ping returned', res))
            .catch(err =>
                console.log('2. Ping.ping rejected', err))
    })
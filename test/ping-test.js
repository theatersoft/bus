'use strict'

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

const
    {Bus} = require('@theatersoft/bus'),
    Ping = Bus.proxy('Ping')

Bus.start()
    .then(() =>
        Ping.ping())
    .then(res =>
        console.log('Ping.ping returned', res))
    .catch(err =>
        console.log('Ping.ping rejected', err))



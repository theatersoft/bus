'use strict'

const
    {bus, proxy, log} = require('@theatersoft/bus'),
    Ping = proxy('Ping')

bus.start()
    .then(async () => {
        log('Ping.ping returned', await Ping.ping())
        log('Ping.fail returned', await Ping.fail())
    })
    .catch(err => log('rejected', err))

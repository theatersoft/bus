'use strict'

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

const
    Bus = require('bus'),
    Connection = require('bus/src/Connection'),
    Ping = Bus.proxy('Ping')

Bus
    .start(Connection.create())
    .then(() => {
        Ping.ping()
            .then(res => {
                console.log('Ping.ping returned', res)
            })
    })



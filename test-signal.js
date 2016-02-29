'use strict'

const
    Bus = require('./src/Bus')

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

Bus.connection = require('./src/Connection')
Bus.context = {parent: {url: 'ws://localhost:5453'}}
Bus.start().then(bus => {
    bus.registerObject({
        ping: () => console.log('ping')
    }, 'Local')

    bus.signal('/Fake.fake', `hello from ${bus.name}`)
})



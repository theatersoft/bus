'use strict'
require('@theatersoft/bus').bus.start()
    .then(bus =>
        bus.registerObject('Ping', {
            ping () {
                console.log('Ping.ping')
                return 'ping'
            }
        }, ['ping']))

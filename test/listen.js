'use strict'

const logSignal = (bus, name) => bus.registerListener(name, data => console.log(name, data))

require('@theatersoft/bus').default.start()
    .then(bus => [
        'Hvac.data',
        'x10.rx',
        'ZWave.state'
    ].forEach(name => logSignal(bus, name)))
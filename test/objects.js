'use strict'
process.on('unhandledRejection', e => console.log(e))

const {bus, proxy} = require('@theatersoft/bus')

bus.start().then(async bus => {
    const _bus = await bus.registerObject('BusObject', new BusObject())
    const _node = bus.registerNodeObject('NodeObject', new NodeObject())

    console.log(_bus)
    console.log(_node)
})

class NodeObject {
    ping () {console.log('ping')}
}

class BusObject {
    getName () {
        return bus.name
    }
}
'use strict'

class Manager  {
    constructor (bus) {
        this.bus = bus
        this.names = new Map()
        console.log('Manager started')
    }

    requestName () {
        console.log('Manager.requestName')

    }

    releaseName () {
        console.log('Manager.releaseName')

    }
}

module.exports = Manager
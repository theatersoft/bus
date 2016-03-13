'use strict'

const Bus = require('bus')
Bus.connection = require('bus/src/BrowserConnection')
Bus.start().then(bus => {
    console.log(`bus name is ${bus.name}`)
})

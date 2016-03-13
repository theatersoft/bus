'use strict'

const
    Bus = require('bus'),
    http = require('http'),
    express = require('express'),
    app = express(),
    port = 5453

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

app.use('/', express.static(`${__dirname}/pub`))

const server = http.createServer(app).listen(port);
console.log('Listening on port ' + port)

const
    TestService = require('./TestService')

Bus.connection = require('bus/src/Connection')
Bus.context = {children: {server}}
Bus.start().then(bus => {
    bus.registerObject('TestService', new TestService())
})



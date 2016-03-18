'use strict'

const
    Bus = require('bus'),
    connection = require('bus/src/Connection'),
    http = require('http'),
    express = require('express'),
    app = express(),
    port = 5453

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

app.use('/', express.static(`${__dirname}/pub`))
const server = http.createServer(app).listen(port);
console.log('Listening on port ' + port)

Bus.start(connection.create({children: {server}})).then(bus => {
    const TestService = require('./TestService')
    bus.registerObject('TestService', new TestService())
})



'use strict'

const
    Bus = require('bus'),
    connection = require('bus/src/Connection'),
    http = require('http'),
    {port} = require('url').parse(process.env.BUS || 'ws://localhost:5453'),
    express = require('express'),
    app = express()

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

app.use('/', express.static(`${__dirname}/pub`))
const server = http.createServer(app).listen(port);
console.log('Listening on port ' + port)

Bus.start(connection.create({children: {server}})).then(bus => {
    //const TestService = require('./TestService')
    //bus.registerObject('TestService', new TestService())
})



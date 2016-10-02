'use strict'

const
    {Bus} = require('@theatersoft/bus'),
    http = require('http'),
    {port} = require('url').parse(process.env.BUS || 'ws://localhost:5453'),
    express = require('express'),
    app = express()

app.use('/', express.static(`${__dirname}/pub`))
const server = http.createServer(app).listen(port);
console.log('Listening on port ' + port)

Bus.start({children: {server}}).then(bus => {
    //const TestService = require('./TestService')
    //bus.registerObject('TestService', new TestService())
})



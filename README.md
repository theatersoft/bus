<p align="center">
<a href="https://www.theatersoft.com">
<img alt="Theatersoft" title="Theatersoft" src="https://www.theatersoft.com/images/theatersoft-logo-text.svg" width="640">
</a>
</p>

# bus
This message bus is the foundation of the Theatersoft platform. It enables communication between host Node.js servers and client web browsers to create a distributed application using modern Javascript.

## Example: Ping Service
This demonstrates a simple ping method call between two bus nodes. 
>In this doc, *node* may refer to either Node.js or a *node* element of a bus network, depending on context.

First, install the package: `npm install @theatersoft/bus`.

### Terminal 1
Start `node` and enter:
```
const {bus} = require('@theatersoft/bus')
bus.start({children: {host: 'localhost', port: 5453}})
```
This root bus node is now listening for child connections to localhost:5453.

Register a bus object `Ping` with one method `ping`:  

```
bus.registerObject('Ping', {ping: () => 'PING!'})
```

### Terminal 2
Open another terminal, start another `node`, and run:
```
const {bus} = require('@theatersoft/bus')
bus.start({parent: 'ws://localhost:5453'})

```
This child bus node is now connected to the parent.

Call the method on the bus object running in terminal 1:
```
const Ping = bus.proxy('Ping')
Ping.ping().then(value => console.log(value))
```
PING!

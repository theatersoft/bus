# bus
This message bus is the foundation of the Theatersoft platform. It enables communication between host Node.js servers and client web browsers to create a distributed application using modern Javascript.

## Quick Sample: Ping Service
This is a simple three step example using one line JavaScript that can be copied into the Node.js REPL.

Begin by installing the bus package in a new project:
```
mkdir ping; cd ping; npm init --yes
npm install @theatersoft/bus --save
```

### 1. Create a root node
Start `node` and run:
```
require('@theatersoft/bus').bus.start({children: {host: '0.0.0.0', port: 5453}})
```
This creates a root bus node that listens for child connections on the specified host and port.

### 2. Register a bus service on a second node
Open a new terminal in the same directory, start another `node`, and run:
```
require('@theatersoft/bus').bus.start().then(bus => bus.registerObject('Ping', {ping: () => 'ping'}))
```
This connects to the parent node (`start()` without arguments defaults the parent url to `ws://localhost:5453`) and registers an object with the `Ping` method.

### 3. Call the service method from a third node
Open a new terminal in the same directory, start another `node`, and run:
```
require('@theatersoft/bus').bus.start().then(async bus => console.log(await bus.proxy('Ping').ping()))
```

`ping`!

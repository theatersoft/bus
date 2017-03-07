# bus
This message bus is the foundation of the Theatersoft platform. Within the platform it manages communication between host Node.js servers and client web browsers, creating a complex distributed application using modern Javascript. The initial Theatersoft application is a home monitoring, control, automation, and surveillance system, however the message bus is designed to be general purpose. For example, other possible uses include: real time chat apps between multiple browsers; connecting web apps to native host server APIs; and embedded browser based applications for automotive, consumer, and industrial markets.

## Simple Ping Service Tutorial
First, clone the repo and build the development module:
```
git clone git@github.com:theatersoft/bus.git
cd bus
npm install
npm run build
npm run link
```
### 1. Start bus server in terminal 1
The next command starts the root bus node which listens for new connections:
```
npm run start

> @theatersoft/bus@1.12.6 start /home/rob/bus
> node dist/start.js

BUS node.init /
BUS registerObject Bus at / interface [ 'init', 'addNode', 'removeNode', 'addName', 'resolveName', 'removeName' ]
BUS manager.addNode /
BUS starting ws server on 0.0.0.0:5453
```
### 2. Start ping service in terminal 2
**In a new terminal** start the test ping service:
```
cd bus/test; npm run ping-service

> test@0.2.0 ping-service /home/rob/bus/test
> node ping-service.js

BUS node.init /2/
BUS   0-> /Bus.addNode( /2/ ) from /2/
BUS   1-> /Bus.addName( Ping ) from /2/
BUS <-0   undefined
BUS <-1   undefined
BUS registerObject Ping at /2/ interface [ 'ping', 'fail' ]
```
You'll notice the log output in the first terminal shows the bus name for the service was added to the bus manager:
```
BUS / adding child /1
BUS   0-> /Bus.addNode( /1/ ) from /1/
BUS manager.addNode /1/
BUS   1-> /Bus.addName( Ping ) from /1/
BUS manager.addName Ping
```
### 3. Start ping test in terminal 3
**In a new terminal** start the ping test:
```
cd bus/test; npm run ping-test

> test@0.2.0 ping-test /home/rob/bus/test
> node ping-test.js

BUS node.init /2/
BUS   0-> /Bus.addNode( /2/ ) from /2/
BUS   1-> /Bus.resolveName( Ping ) from /2/
BUS <-0   undefined
BUS <-1   /1/
BUS   2-> /1/Ping.ping( ) from /2/
BUS <-2   ping
Ping.ping returned ping
BUS   3-> /1/Ping.fail( ) from /2/
BUS <-3   fail FAILED
BUS Proxy request { path: '/1/', intf: 'Ping', member: 'fail', args: [] } rejected fail
rejected fail
```
This ping test called methods (which returned 'ping' and threw 'fail' respectively) in the Ping service running in terminal 2:
```
BUS   2-> /1/Ping.ping( ) from /2/
Ping.ping
BUS   3-> /1/Ping.fail( ) from /2/
Ping.fail
```
You'll also see the bus requests logged in terminal 1 as they are routed through the root node:
```
BUS / adding child /2
BUS   0-> /Bus.addNode( /2/ ) from /2/
BUS manager.addNode /2/
BUS   1-> /Bus.resolveName( Ping ) from /2/
BUS manager.resolveName Ping /1/
BUS   2-> /1/Ping.ping( ) from /2/
BUS   3-> /1/Ping.fail( ) from /2/
```

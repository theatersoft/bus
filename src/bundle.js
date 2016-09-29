import {setConnection} from './Bus'
import Connection from './Connection'
setConnection(Connection)

export {default as Bus } from './Bus'
export {default as Connection} from './Connection'
export {default as EventEmitter} from './EventEmitter'

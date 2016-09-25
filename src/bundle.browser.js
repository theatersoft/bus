import {setConnection} from './Bus'
import Connection from './BrowserConnection'
setConnection(Connection)

export {default as Bus} from './Bus'
export {default as Connection} from './BrowserConnection'
export {default as EventEmitter} from './EventEmitter'
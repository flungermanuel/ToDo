import { join } from 'node:path'
import { JsonStorage } from '../JsonStorage'
import { runStorageContract } from './storageContract'

runStorageContract('JsonStorage', (dir) => new JsonStorage(join(dir, 'todo-data.json')))

import { join } from 'node:path'
import { SqliteStorage } from '../SqliteStorage'
import { runStorageContract } from '../../__tests__/storageContract'

runStorageContract('SqliteStorage', (dir) => new SqliteStorage(join(dir, 'flungdo.db')))

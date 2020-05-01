export { Database, DatabaseConfigurations } from "./database";
export { BaseModel } from "./types/base-schema";
export { Persistence, PersistenceEvent } from "./core";

export { IDB_Persistence_Adapter } from "./adapters/indexeddb"; //__IMPORT_IDB
export { FS_Persistence_Adapter } from "./adapters/fs-adapter"; //__IMPORT_FS

// ^ the above twp lines will be modified during build. check rollup.config.js

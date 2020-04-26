import { Persistence as Base, PersistenceEvent } from "../core/persistence";
export declare class IDB_Persistence_Adapter extends Base {
    init(): Promise<void>;
    readIndexes(event: PersistenceEvent): Promise<void>;
    readData(event: PersistenceEvent): Promise<void>;
    rewriteIndexes(event: PersistenceEvent): Promise<void>;
    rewriteData(event: PersistenceEvent): Promise<void>;
    appendIndex(data: string): Promise<void>;
    appendData(data: string): Promise<void>;
}

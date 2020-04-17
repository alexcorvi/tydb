/// <reference types="node" />
import { Datastore } from "./datastore";
import { BaseSchema } from "../types/base-schema";
interface PersistenceOptions<G extends Partial<BaseSchema>> {
    db: Datastore<G>;
    afterSerialization?: (raw: string) => string;
    beforeDeserialization?: (encrypted: string) => string;
    corruptAlertThreshold?: number;
}
/**
 * Create a new Persistence object for database options.db
 */
export declare class Persistence<G extends Partial<BaseSchema>> {
    db: Datastore<G>;
    filename: string;
    corruptAlertThreshold: number;
    afterSerialization: (s: string) => string;
    beforeDeserialization: (s: string) => string;
    autocompactionIntervalId: NodeJS.Timeout | undefined;
    constructor(options: PersistenceOptions<G>);
    /**
     * Persist cached database
     * This serves as a compaction function since the cache always contains only the actual of documents in the collection
     * while the data file is append-only so it may grow larger
     */
    persistCachedDatabase(): Promise<void>;
    /**
     * Queue a rewrite of the datafile
     */
    compactDatafile(): Promise<void>;
    /**
     * Set automatic compaction every interval ms
     */
    setAutocompactionInterval(interval?: number): void;
    /**
     * Stop autocompaction (do nothing if autocompaction was not running)
     */
    stopAutocompaction(): void;
    /**
     * Persist new state for the given newDocs (can be insertion, update or removal)
     * Use an append-only format
     */
    persistNewState(newDocs: any[]): Promise<void>;
    /**
     * From a database's raw data, return the corresponding
     * machine understandable collection
     */
    treatRawData(rawData: string): {
        data: any[];
        indexes: {
            [key: string]: any;
        };
    };
    /**
     * Load the database
     * 1) Create all indexes
     * 2) Insert all data
     * 3) Compact the database
     * This means pulling data out of the data file or creating it if it doesn't exist
     * Also, all data is persisted right away, which has the effect of compacting the database file
     * This operation is very quick at startup for a big collection (60ms for ~10k docs)
     */
    loadDatabase(): Promise<void>;
}
export {};

/// <reference types="node" />
import { Datastore } from "./datastore";
import { BaseModel } from "../types";
declare type PersistenceEventCallback = (message: string) => Promise<void>;
declare type PersistenceEventEmits = "readLine" | "writeLine" | "end";
export declare class PersistenceEvent {
    callbacks: {
        readLine: Array<PersistenceEventCallback>;
        writeLine: Array<PersistenceEventCallback>;
        end: Array<PersistenceEventCallback>;
    };
    on(event: PersistenceEventEmits, cb: PersistenceEventCallback): void;
    emit(event: PersistenceEventEmits, data: string): Promise<void>;
}
interface PersistenceOptions<G extends Partial<BaseModel>> {
    db: Datastore<G>;
    afterSerialization?: (raw: string) => string;
    beforeDeserialization?: (encrypted: string) => string;
    corruptAlertThreshold?: number;
    model?: (new () => G) & {
        new: (json: G) => G;
    };
}
/**
 * Create a new Persistence object for database options.db
 */
export declare class Persistence<G extends Partial<BaseModel> = any> {
    db: Datastore<G>;
    ref: string;
    corruptAlertThreshold: number;
    afterSerialization: (s: string) => string;
    beforeDeserialization: (s: string) => string;
    autocompactionIntervalId: NodeJS.Timeout | undefined;
    private _model;
    protected _memoryIndexes: string[];
    protected _memoryData: string[];
    constructor(options: PersistenceOptions<G>);
    private persistAllIndexes;
    private persistAllData;
    private persistCachedDatabase;
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
    persistByAppendNewIndex(newDocs: any[]): Promise<void>;
    persistByAppendNewData(newDocs: any[]): Promise<void>;
    treatSingleLine(line: string): {
        type: "index" | "doc" | "corrupt";
        status: "add" | "remove";
        data: any;
    };
    /**
     * Load the database
     * 1) Create all indexes
     * 2) Insert all data
     * This means pulling data out of the data file or creating it if it doesn't exist
     */
    loadDatabase(): Promise<boolean>;
    init(): Promise<void>;
    readIndexes(event: PersistenceEvent): Promise<void>;
    readData(event: PersistenceEvent): Promise<void>;
    rewriteIndexes(event: PersistenceEvent): Promise<void>;
    rewriteData(event: PersistenceEvent): Promise<void>;
    appendIndex(data: string): Promise<void>;
    appendData(data: string): Promise<void>;
}
export {};

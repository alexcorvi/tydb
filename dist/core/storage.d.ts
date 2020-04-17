/// <reference types="node" />
import { appendFile, exists, readFile, rename, unlink, writeFile } from "fs";
declare const _storage: {
    appendFile: typeof appendFile.__promisify__;
    exists: typeof exists.__promisify__;
    readFile: typeof readFile.__promisify__;
    rename: typeof rename.__promisify__;
    unlink: typeof unlink.__promisify__;
    writeFile: typeof writeFile.__promisify__;
    mkdirp: (targetDir: string) => Promise<string>;
    ensureFileDoesntExist: (file: string) => Promise<void>;
    /**
     * Flush data in OS buffer to storage if corresponding option is set
     * If options is a string, it is assumed that the flush of the file (not dir) called options was requested
     */
    flushToStorage: (options: string | {
        filename: string;
        isDir: boolean;
    }) => Promise<{}>;
    /**
     * Fully write or rewrite the datafile, immune to crashes during the write operation (data will not be lost)
     */
    crashSafeWriteFile: (filename: string, data: string) => Promise<void>;
    /**
     * Ensure the data file contains all the data, even if there was a crash during a full file write
     */
    ensureDataFileIntegrity: (filename: string) => Promise<void>;
};
declare const storage: typeof _storage;
export { storage };

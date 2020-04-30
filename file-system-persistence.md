---
description: How the default file system persistence has been achieved.
---

# File System Persistence

```typescript
import { Database, FS_Persistence_Adapter } from "tydb";

const mydb = new Database({
    ref: "a-database-name",
    persistence_adapter: FS_Persistence_Adapter,
});
```

### Introduced files

File system adapter persists data by saving two files at your hard drive:

1. The data file, where a serialized version of your documents is saved, each line represents a document.
2. The indexes file, where a serialized version of the indexes is saved, each line represents index options.

The name and location of those two files depends on the `ref` parameter. So if the ref parameter is like this: `/mnt/c/Users/alias/mydb` the two files would be:

* `/mnt/c/Users/alias/mydb` as the data file.
* `/mnt/c/Users/alias/mydb.idx.db` as the indexes file.

### Appending only

As you perform database operations \(insert, update, delete\) the changes you introduced will be persisted to files by appending new lines into the file. Meaning that all insertions, updates and deletes actually result in lines added at the end of the file, for performance and reliability reasons. So you may notice two lines in the data file referencing the same document.

This would result in an ever increasing file size, even when deleting everything and clearing the database. This is why a [database compaction](database-operations.md#database-compact) and [auto compaction methods](database-operations.md#database-resetautocompaction) and [configurations](database-configurations.md#autocompaction) has been introduced.

### Line by line

As you instantiate the database, and also when you [reload the database](database-operations.md#database-reload), it will look for the data file and the index file, create them if they do not exist, and load them if they do exist. Reading those actually happens as a stream, line by line. This for better memory management and to better deal with large files that goes over 256 MB. 

### Crash-safe writes & locking

As discussed above, regular database operations that require persistence \(insert, update, delete\) are persisted to the file system by an append-only mechanism. However, in some cases, a total re-write of the file might be required, like for example when compacting the files.

There's more than few things that could go wrong when rewriting a file in the hard drive, this is why the adapter has introduced two mechanism to increase the reliability:

#### 1. Crash safe writes

The adapter doesn't directly rewrite a file, it actually creates a new file, the new file name ends with the symbol `~` and only when the rewrite process finishes without any errors or crashes, it renames the temporary file to the original file, thus replacing it.

#### 2. File locks

When two database instances have the same ref, they would use the same file, and in such situation things can go bad when both of them open the same file and work on it. This is why the adapter introduces "**file locks**" so the first instance will lock the file and won't allow any other instance to change its contents unless it unlocks it.


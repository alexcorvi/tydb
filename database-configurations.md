---
description: 'Reference, encoding, timestamps, persistence, compaction...etc.'
---

# Database Configurations

Here's an example of database configuration object:

```typescript
import { Database, BaseModel, FS_Persistence_Adapter } from "tydb";

class MyModel extends BaseModel {
    name: string = "alex";
    yearBorn: number = 1992;
}

const mydb = new Database<MyModel>({
    ref: "a-database-name",
    model: MyModel,
    afterSerialization: (str: string)=>str,
    beforeDeserialization: (str: string)=>str,
    corruptAlertThreshold: 0,
    timestampData: false,
    persistence_adapter: FS_Persistence_Adapter,
    autoCompaction: 10 * 60 * 1000,
    reloadBeforeOperations: false
});
```

## `ref`

**`type:`** `string`

**`default:`** `no default, parameter is required`

This a string used as a reference for the database. The database system will use this string in different ways based on how you're running your database.

* **File persistence**: If you're going to use the file persistence adapter, then the file name \(and path\) will be this string.
* **IndexedDB persistence**: If you're going to use the IndexedDB persistence adapter, then the indexedDB database will be the same as this string.
* **In-memory only \(no persistence\)**: If you're not persisting the data, then this string will have no use at all.
* **Network connection**: If you're connecting to another database instance over the network, then this string will be used to connect to the database instance and it must be in the following format: `tydb://http://127.0.0.1:3000/mydb`.
  * The database will recognize that you're connecting to an over-the-network database since the ref starts with `tydb://`, the next part of the string will be used to recognize the location and database name. Hence:
    * Replace `http://127.0.0.1:3000` with the URL of the database.
    * Replace `dbref` with the ref field of the network database.

{% hint style="info" %}
When connecting to a database through the network, the instance will only act like a shell and send all operations \(creating, reading, updating, deleting... etc.\) to the remote instance of the database.

In such case, the only database configurations that matters are the `ref` and the `model`, all other configurations will be ignored.
{% endhint %}

## `model`

**`type:`** `class extends BaseModel`

**`default:`** `no default, parameter is required`

This is the part where strong typing and object mapping occurs. A model should be written to describe your document, the properties of this model are actually used as a type declaration for your document. Also, You ought to use this class for creating new documents. 

```typescript
import { Database, BaseModel } from "tydb";

class Employee extends BaseModel {
	name: string = "alex"; // default name is "alex"
	yearBorn: number = 1992; // default yearBorn is 1992
	
	// this computed propery
	// will not be saved to the database
	// however, you can use it in querying
	// and you would get it when you get
	// the document from the DB
	get age() {
		return new Date().getFullYear() - this.yearBorn;
	}
	
	// this method will not be saved
	// to the database, and you won't
	// you would also get it when you
	// get the document from the DB
	toIDCard() {
		let names = this.name.split(/\s/);
		return {
			firstName: names[0],
			lastName: names[names.length - 1],
			age: this.age,
		};
	}
}

// the "new" method comes from the BaseModel
// which is what your model extending
// and is strongly typed
const alex = Employee.new({
	// you can omit any of the properties
	// and the defaults you defined above
	// will be used.
	yearBorn: 1990,
	name: "Alex Corvi",
	// make sure not to set a computef property
	// like "age" or a method like "toIDCard"
	// since you will change the typing of your
	// data at runtime and will lose type-strongness
});


const db = new Database<Employee>({
	ref: "employees.db",
	model: Employee
});

db.insert([alex]);
```

## `afterSerialization`

**`type:`** `(input:string)=>string`

**`default:`** `undefined`

Use this configuration parameter to implement an encoding/encrypting function. The encrypted string will be used when persisting the data, so when persisting data to the disk - for example, the file will have the resulting string out of this function, not the raw data \(The raw data is mostly a stringified JSON object\).

This is especially useful for when you want to encrypt the data. However, keep in mind that your encrypting function could have negative effects on performance.

This parameter:

* Must be used along side `beforeDeserialization`.
* Must be the reverse of `beforeDeserialization`.



## `beforeDeserialization`

**`type:`** `(input:string)=>string`

**`default:`** `undefined`

This parameter:

* Must be used along side `afterSerialization`.
* Must be the reverse of `afterSerialization`.



```typescript
/**
* In this example we encode the
* raw data strings to HEX representation.
*/

function toHex(plain: string) {
	const hex = plain
		.split("")
		.map((c) => c.charCodeAt(0).toString(16))
		.join("");
	return hex;
}

function fromHex(hex: string) {
	let plain = "";
	for (let i = 0; i < hex.length; i += 2) {
		plain += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	}
	return plain;
}

const db = new Database<Employee>({
	ref: "employees.db",
	afterSerialization: toHex,
	beforeDeserialization: fromHex,
});


```

## `corruptAlertThreshold`

**`type:`** `number`

**`default:`** `0`

Although different measures has been taken to avoid data loss and corruption, it is still always a possibility. You can set this parameter to something between 0 and 1, to have some tolerance for corrupted data. It defaults to `0`, i.e. not tolerance for data corruption.

```typescript
const db = new Database<Employee>({
	ref: "employees.db",
	corruptAlertThreshold: 0.1,
	// tolerate corruption only if it is
	// less than or equal to 10% of the
	// total data
});

```

## `timestampData`

**`type:`** `boolean`

**`default:`** `false`

By default the database will not add the `createdAt` and `updatedAt` fields. Set this parameter to true, and those fields will have the relevant values as a `Date` object.

## `persistence_adapter`

**`type:`** `class extends Persistence`

**`default:`** `Persistence (in memory only)`

By default the database will not persist any data. All will be saved to memory only, and will be lost once the instance is closed. To persist data, you must use a _persistence adapter_. I have made the persistence adapter to be pluggable and extensible so you can use different adapters for different uses.

Two adapters are shipped with the database, those are:

* `IDB_Persistence_Adapter`: Use this one when running in the browser environment, data will be persisted to IndexedDB.
* `FS_Persistence_Adapter`: Use this option when running in NodeJS, data will be persisted to the disk.

```typescript
import { Database, FS_Persistence_Adapter } from "tydb";

const mydb = new Database({
    ref: "a-database-name",
    persistence_adapter: FS_Persistence_Adapter,
});


// or, when in browser:

import { Database, IDB_Persistence_Adapter} from "tydb";

const mydb = new Database({
    ref: "a-database-name",
    persistence_adapter: IDB_Persistence_Adapter,
});
```

Although you can write your own adapter, using those that already ship with the database is recommended, as it has been tried & tested.

Writing your own adapter is also possible and fairly simple. For more about persistence adapter visit the page "persistence adapters" in this documentation.

## `autoCompaction`

**`type:`** `number`

**`default:`** `0 (no auto compaction)`

When persisting data \(e.g. into a file\), the data will be persisted by appending, this is to avoid re-writing of the whole file in case of removing or updating. This behavior might result in an increase in the persistence layer size \(e.g. file size\). That's why the database provides you with a function to compact the file size:

```typescript
import { Database, FS_Persistence_Adapter } from "tydb";
const mydb = new Database({
    ref: "a-database-name",
    persistence_adapter: FS_Persistence_Adapter,
});
mydb.compact(); // returns a promise
```

In the database configuration you may set the database to call this method automatically on timely intervals:

```typescript
import { Database, FS_Persistence_Adapter } from "tydb";

const mydb = new Database({
    ref: "a-database-name",
    persistence_adapter: FS_Persistence_Adapter,
    autoCompaction: 60 * 60 * 1000 // in ms
    // ^ compaction every hour
});
```

However, the minimum compaction interval is 5 seconds \(5000 ms\). Setting it anything lower than 5 seconds will be ignored and will be reset to 5 seconds. Setting it to `0` will disable auto compaction. 

## `reloadBeforeOperations`

**`type:`** `boolean`

**`default:`** `false`

Setting this parameter to `true` will make all operations \(inserting, reading, updating & deleting documents\) preceded by a reloading of the persistence layer \(e.g. the file in the disk\). This especially useful for cases when two instances of the database are on the same file \(i.e. sharing the same data\).


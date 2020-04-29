---
description: >-
  Writing, reading, updating, deleting, counting, indexing, reloading and
  compacting.
---

# Database Operations

```typescript
class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    ref: "a-database-name",
    model: Model,
});

await db.insert([Model.new({ yearBorn: 11 })]);
await db.find({ filter: { yearBorn: 11 } });
await db.update({ filter: { yearBorn: 11 }, update: { $set: { yearBorn: 11 } } });
await db.upsert({
    filter: { yearBorn: 11 },
    update: { $set: { yearBorn: 5 }, $setOnInsert: Model.new({ yearBorn: 5 }) },
});
await db.count({ yearBorn: 11 });
await db.delete({ filter: { yearBorn: 11 }, multi: true });
await db.createIndex({fieldName: "name"});
await db.removeIndex("name");
await db.reload();
await db.compact();
await db.forcefulUnlock();
await db.stopAutoCompaction();
await db.resetAutoCompaction(9000);
```

## `Database.insert`

| argument type | return type | aliases |
| :--- | :--- | :--- |


<table>
  <thead>
    <tr>
      <th style="text-align:left"><code>Array&lt;Model&gt;</code>
      </th>
      <th style="text-align:left">
        <p><code>Promise&lt;{</code>
        </p>
        <p> <code>docs: Array&lt;Model&gt;;</code>
        </p>
        <p> <code>number: number;</code>
        </p>
        <p><code>}&gt;</code>
        </p>
      </th>
      <th style="text-align:left"><code>Database.create</code>
      </th>
    </tr>
  </thead>
  <tbody></tbody>
</table>```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "alex"; // default is "alex"
    yearBorn: number = 1992; // default is 
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

await db.insert([
    Model.new({
        yearBorn: 1990
        /* default name will be used */
    }),
    Model.new({
        name: "john"
        /* default yearBorn will be used */
    }),
    Model.new({
        name: "john"
        yearnBorn: 1980,
        _id: "some-unique-id",
    }),
]);
```

## `Database.find`

| argument type | return type | aliases |
| :--- | :--- | :--- |


<table>
  <thead>
    <tr>
      <th style="text-align:left">
        <p><code>{</code>
        </p>
        <p> <code>filter?: Query&lt;Model&gt;;</code>
        </p>
        <p> <code>skip?: number;</code>
        </p>
        <p> <code>limit?: number;</code>
        </p>
        <p> <code>sort?: Sort&lt;Model&gt;;</code>
        </p>
        <p><code>}</code>
        </p>
      </th>
      <th style="text-align:left">
        <p><code>Promise&lt;</code>
        </p>
        <p> <code>Array&lt;Model&gt;</code>
        </p>
        <p><code>&gt;</code>
        </p>
      </th>
      <th style="text-align:left"><code>Database.read</code>
      </th>
    </tr>
  </thead>
  <tbody></tbody>
</table>```typescript
interface FindArgument<Model> {
    filter?: Query<Model>; // optional
    skip?: number; // optional
    limit: number; // optional
    sort: Sort<Model>; // optional
}
```

Where:

* `filter` is a query similar to the query language of MongoDB, it can accepts direct equality evaluation like `{age: 11}` or a field level operator: `{age: { $gt: 11 }}` or a top level operator: `$or: [{ age: 11 }, { age: 12 }]`.

{% hint style="info" %}
Operators are those parameter that starts with the dollar sign `$` \(e.g. `$gt`, `$lt`, `$or...` etc.\). Field names \(e.g. `name`, `age`, `yearBorn`\) can not start with a dollar sign.
{% endhint %}

* `skip` and `limit` are both number, and basically self-explanatory.
* `sort` is an object that its keys must be the same as `Model` keys \(or some of them\), yet the value of those keys must be either `1` \(for ascending sorting\) or `-1` \(for descending sorting\).

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

/**
 * Will find all documents that has year born
 * as 1992 and named "alex"
 */
await db.find({
    filter: {
        // direct filtering
        yearBorn: 11,
        name: "alex",
    },
});
/**
 * Will find all documents that has year born
 * less than 1990 (1989, 1988 ... etc)
 */
await db.find({
    filter: {
        // field level operator
        yearBorn: { $lt: 1990 },
    },
});
/**
 * Will find all documents that has year born
 * either 1991 or 1981
 */
await db.find({
    filter: {
        // top level operator
        $or: [{ yearBorn: 1991 }, { yearBorn: 1981 }],
    },
});
/**
 * Will find all documents that has year born
 * not greater than 1990 nor less than 1980
 * and named alex
 */
await db.find({
    filter: {
        // top level operator
        // with field level operator
        $nor: [{ yearBorn: { $lt: 1980 } }, { yearBorn: { $gt: 1990 } }],
        name: "alex",
    },
});
```

You can also use the computed value when filtering \(the beauty of object mapping\).

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

/**
 * Will find all documents that has
 * the computed value "age" as 12 
 * and named "alex"
 */
await db.find({
    filter: {
        // direct filtering
        age: 12,
        name: "alex",
    },
});
```

{% hint style="info" %}
For more about query operators and options read: [Query API documentation](query-api.md). And for more about the benifit of object mapping in the query API, read: [Object Mapping documentation](object-mapping.md).
{% endhint %}

## `Database.update`

| argument type | return type | aliases |
| :--- | :--- | :--- |


<table>
  <thead>
    <tr>
      <th style="text-align:left">
        <p><code>{</code>
        </p>
        <p> <code>filter: Query&lt;Model&gt;;</code>
        </p>
        <p> <code>update: Update&lt;Model&gt;;</code>
        </p>
        <p> <code>multi: boolean;</code>
        </p>
        <p><code>}</code>
        </p>
      </th>
      <th style="text-align:left">
        <p><code>Promise&lt;{</code>
        </p>
        <p> <code>docs: Array&lt;Model&gt;;</code>
        </p>
        <p> <code>number: number;</code>
        </p>
        <p><code>}&gt;</code>
        </p>
      </th>
      <th style="text-align:left"><em>non</em>
      </th>
    </tr>
  </thead>
  <tbody></tbody>
</table>```typescript
interface FindArgument<Model> {
    filter: Query<Model>;
    update: Update<Model>;
    multi: boolean; // optional, defaults to false
}
```

Where:

* `filter` is a query similar to the query language of MongoDB, it can accepts direct equality evaluation like `{age: 11}` or a field level operator: `{age: { $gt: 11 }}` or a top level operator: `$or: [{ age: 11 }, { age: 12 }]`.

{% hint style="info" %}
Operators are those parameter that starts with the dollar sign `$` \(e.g. `$gt`, `$lt`, `$or...` etc.\). Field names \(e.g. `name`, `age`, `yearBorn`\) can not start with a dollar sign.
{% endhint %}

* `update` is an object of update operators and modifiers, similar to the update operators and modifiers of MonogDB. 
* `multi` is a `boolean`, defaults to false, if true it will update all the matched documents, if it's false it will update only the first matched document.

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

await db.update({
    filter: { age: 11 },
    // increment yearBorn by 15
    // and set name to "john"
    update: { $inc: { yearBorn: 15 }, $set: { name: "john" } },
});
```

{% hint style="info" %}
For more about query operators and options read: [Query API documentation](query-api.md). And for more about update operators and modifiers read: [Update API documentation](update-api.md).
{% endhint %}

{% hint style="info" %}
**Do not** apply update operators to the **`readonly`** values that are the computed properties \(e.g. age property in the model above\).
{% endhint %}

## `Database.upsert`

| argument type | return type | aliases |
| :--- | :--- | :--- |


<table>
  <thead>
    <tr>
      <th style="text-align:left">
        <p><code>{</code>
        </p>
        <p> <code>filter: Query&lt;Model&gt;;</code>
        </p>
        <p> <code>update: Upsert&lt;Model&gt;;</code>
        </p>
        <p> <code>multi: boolean;</code>
        </p>
        <p><code>}</code>
        </p>
      </th>
      <th style="text-align:left">
        <p><code>Promise&lt;{</code>
        </p>
        <p> <code>docs: Array&lt;Model&gt;;</code>
        </p>
        <p> <code>number: number;</code>
        </p>
        <p> <code>upsert:boolean</code>
        </p>
        <p> <code>// ^ would be true if</code>
        </p>
        <p> <code>// new document was</code>
        </p>
        <p> <code>// inserted</code>
        </p>
        <p><code>}&gt;</code>
        </p>
      </th>
      <th style="text-align:left"><em>non</em>
      </th>
    </tr>
  </thead>
  <tbody></tbody>
</table>```typescript
interface FindArgument<Model> {
    filter: Query<Model>;
    update: Upsert<Model>;
    multi: boolean; // optional, defaults to false
}
```

Where:

* `filter` is a query similar to the query language of MongoDB, it can accepts direct equality evaluation like `{age: 11}` or a field level operator: `{age: { $gt: 11 }}` or a top level operator: `$or: [{ age: 11 }, { age: 12 }]`.

{% hint style="info" %}
Operators are those parameter that starts with the dollar sign `$` \(e.g. `$gt`, `$lt`, `$or...` etc.\). Field names \(e.g. `name`, `age`, `yearBorn`\) can not start with a dollar sign.
{% endhint %}

* `update` is an object of update operators and modifiers, similar to the update operators and modifiers of MonogDB. But with one required field \(`$setOnInsert`\). This field value must the document to be inserted if no documents where found to be updates. 
* `multi` is a `boolean`, defaults to false, if true it will update all the matched documents, if it's false it will update only the first matched document.

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

await db.upsert({
    filter: { name: "alex" },
    update: {
      $set: { age: 5 },
      $setOnInsert: Model.new({ age: 5, name: "alex" })
    },
});
```

{% hint style="info" %}
For more about query operators and options read: [Query API documentation](query-api.md). And for more about update operators and modifiers read: [Update API documentation](update-api.md).
{% endhint %}

{% hint style="info" %}
**Do not** apply update operators to the **`readonly`** values that are the computed properties \(e.g. age property in the model above\).
{% endhint %}

## `Database.count`

| argument type | return type | aliases |
| :--- | :--- | :--- |
| `Query<Model>` | `Promise<number>` | `Database.number` |

For counting documents that meet a specified query. This method takes the `Query<Model>` as an argument. It is similar to the query language of MongoDB, it can accepts direct equality evaluation like `{age: 11}` or a field level operator: `{age: { $gt: 11 }}` or a top level operator: `$or: [{ age: 11 }, { age: 12 }]`.

{% hint style="info" %}
Operators are those parameter that starts with the dollar sign `$` \(e.g. `$gt`, `$lt`, `$or...` etc.\). Field names \(e.g. `name`, `age`, `yearBorn`\) can not start with a dollar sign.
{% endhint %}

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

/**
 * Will count all documents that has year born
 * as 1992 and named "alex"
 */
await db.count({
    // direct filtering
    yearBorn: 11,
    name: "alex",
});
/**
 * Will count all documents that has year born
 * less than 1990 (1989, 1988 ... etc)
 */
await db.count({
    // field level operator
    yearBorn: { $lt: 1990 },
});
/**
 * Will count all documents that has year born
 * either 1991 or 1981
 */
await db.count({
    // top level operator
    $or: [{ yearBorn: 1991 }, { yearBorn: 1981 }],
});
/**
 * Will count all documents that has year born
 * not greater than 1990 nor less than 1980
 * and named alex
 */
await db.count({
    // top level operator
    // with field level operator
    $nor: [{ yearBorn: { $lt: 1980 } }, { yearBorn: { $gt: 1990 } }],
    name: "alex",
});
```

## `Database.delete`

| argument type | return type | aliases |
| :--- | :--- | :--- |


<table>
  <thead>
    <tr>
      <th style="text-align:left">
        <p><code>{</code>
        </p>
        <p> <code>filter: Query&lt;Model&gt;;</code>
        </p>
        <p> <code>multi: boolean;</code>
        </p>
        <p><code>}</code>
        </p>
      </th>
      <th style="text-align:left">
        <p><code>Promise&lt;{</code>
        </p>
        <p> <code>docs: Array&lt;Model&gt;;</code>
        </p>
        <p> <code>number: number;</code>
        </p>
        <p><code>}&gt;</code>
        </p>
      </th>
      <th style="text-align:left"><code>Database.remove</code>
      </th>
    </tr>
  </thead>
  <tbody></tbody>
</table>```typescript
interface FindArgument<Model> {
    filter: Query<Model>;
    update: Upsert<Model>;
    multi: boolean; // optional, defaults to false
}
```

Where:

* `filter` is a query similar to the query language of MongoDB, it can accepts direct equality evaluation like `{age: 11}` or a field level operator: `{age: { $gt: 11 }}` or a top level operator: `$or: [{ age: 11 }, { age: 12 }]`.

{% hint style="info" %}
Operators are those parameter that starts with the dollar sign `$` \(e.g. `$gt`, `$lt`, `$or...` etc.\). Field names \(e.g. `name`, `age`, `yearBorn`\) can not start with a dollar sign.
{% endhint %}

* `multi` is a `boolean`, defaults to false, if true it will update all the matched documents, if it's false it will update only the first matched document.

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});


/**
 * deletes ALL documents that has 11
 * as the value of property "age"
*/
await db.delete({
    filter: { age: 11 },
    multi: true
});
```

## `Database.createIndex`

| argument type | return type | aliases |
| :--- | :--- | :--- |


<table>
  <thead>
    <tr>
      <th style="text-align:left">
        <p><code>{</code>
        </p>
        <p> <code>fieldName: string;</code>
        </p>
        <p> <code>unique?: boolean;</code>
        </p>
        <p> <code>sparse?: boolean;</code>
        </p>
        <p> <code>expireAfterSeconds?: number;</code>
        </p>
        <p><code>}</code>
        </p>
      </th>
      <th style="text-align:left">
        <p><code>Promise&lt;{</code>
        </p>
        <p> <code>affectedIndex: string</code>
        </p>
        <p><code>}&gt;</code>
        </p>
      </th>
      <th style="text-align:left"><code>Database.ensureIndex</code>
      </th>
    </tr>
  </thead>
  <tbody></tbody>
</table>* **`fieldName`** \(required\): name of the field to index.
* **`unique`** \(optional, defaults to `false`\): enforce field uniqueness. Note that a unique index will raise an error if you try to index two documents for which the field is not defined.
* **`sparse`** \(optional, defaults to `false`\): don't index documents for which the field is not defined. Use this option along with "unique" if you want to accept multiple documents for which it is not defined.
* **`expireAfterSeconds`** \(number of seconds, optional\): if set, the created index is a TTL \(time to live\) index, that will automatically remove documents when the system date becomes larger than the date on the indexed field plus `expireAfterSeconds`. Documents where the indexed field is not specified or not a `Date` object are ignored.

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "alex"; // default is "alex"
    yearBorn: number = 1992; // default is 
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

await db.createIndex({
  fieldName: "name",
  unique: false,
  sparse: false
});
```

## `Database.removeIndex`

| argument type | return type | aliases |
| :--- | :--- | :--- |


<table>
  <thead>
    <tr>
      <th style="text-align:left"><code>string</code>
      </th>
      <th style="text-align:left">
        <p><code>Promise&lt;{</code>
        </p>
        <p> <code>affectedIndex: string</code>
        </p>
        <p><code>}&gt;</code>
        </p>
      </th>
      <th style="text-align:left"><em>non</em>
      </th>
    </tr>
  </thead>
  <tbody></tbody>
</table>```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "alex"; // default is "alex"
    yearBorn: number = 1992; // default is 
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

await db.removeIndex("name");
```

## `Database.reload`

| argument type | return type | aliases |
| :--- | :--- | :--- |
| _non_ | `Promise<void>` | _non_ |

Reloading the persistence layer \(e.g. the file\) of the database, so any changes that were made external to the instance of the database will be loaded into this instance.

```typescript
import { BaseModel, Database, FS_Persistence_Adapter } from "./src";

class Model extends BaseModel {
    name: string = "";
    yearBorn: number = 0;
}

// first instance
const db1 = new Database<Model>({
    ref: "a-database-name",
    model: Model,
    persistence_adapter: FS_Persistence_Adapter
});

// second instance on the same ref
// using the same persistence adapter
const db2 = new Database<Model>({
    ref: "a-database-name",
    model: Model,
    persistence_adapter: FS_Persistence_Adapter
});


await db1.insert([Model.new({name: "john", yearBorn: 1983})])

// db2 is not aware of the insertion occurred in db1
// although they are both using the same file

await db2.reload();
```

## `Database.forcefulUnlock`

| argument type | return type | aliases |
| :--- | :--- | :--- |
| _non_ | `Promise<void>` | _non_ |

There's a locking mechanism implemented in the file system persistence adapter to prevent two instances from modifying the same file at once. So one of them has to wait for the other. However, it may occur that one of the instances would crash while modifying the file and the lock would still be there, so the other instance would have to wait forever for the file to be unlocked.

This is why this utility method is provided as a means of forcefully unlocking the file.

## `Database.compact`

| argument type | return type | aliases |
| :--- | :--- | :--- |
| _non_ | `Promise<void>` | _non_ |

When persisting data \(e.g. into a file\), the data will be persisted by appending, this is to avoid re-writing of the whole file in case of removing or updating. This behavior might result in an increase in the persistence layer size \(e.g. file size\). That's why the database provides you with a function to compact the file size:

```typescript
import { Database, FS_Persistence_Adapter } from "tydb";
const mydb = new Database({
    ref: "a-database-name",
    persistence_adapter: FS_Persistence_Adapter,
});
mydb.compact(); // returns a promise
```

## `Database.resetAutoCompaction`

| argument type | return type | aliases |
| :--- | :--- | :--- |
| `number` | `Promise<void>` | _non_ |

Resetting \(or starting\) auto compaction at intervals of time.

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "alex"; // default is "alex"
    yearBorn: number = 1992; // default is 
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
});

await db.resetAutoCompaction(10000) // every 10 seconds
setTimeout(async ()=>{
    // after 20 seconds, auto compaction
    // will occur every 30 seconds
    await db.resetAutoCompaction(30000)
},20000)
```

## `Database.stopAutoCompaction`

| argument type | return type | aliases |
| :--- | :--- | :--- |
| _non_ | `Promise<void>` | _non_ |

Stopping auto compaction.

```typescript
import { BaseModel, Database } from "./src";

class Model extends BaseModel {
    name: string = "alex"; // default is "alex"
    yearBorn: number = 1992; // default is 
    get age() {
        return new Date().getFullYear() - this.yearBorn;
    }
}

const db = new Database<Model>({
    // database configuration parameters ...
    ref: "a-database-name",
    model: Model,
    autoCompaction: 900
});

await db.stopAutoCompaction();
```


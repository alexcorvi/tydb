---
description: Installation & basic usage
---

# Getting Started

## Installation

Using yarn or NPM you can install TyDB like this

```text
$ npm i tydb
$ yarn add tydb
```

{% hint style="info" %}
You may also want to install it globally using the `-g` flag if you'd like to use the shell and the server features.
{% endhint %}

{% hint style="info" %}
The following code in all of this documentation website is in typescript, as the database is intended to be used with typescript, although it can perfectly work with pure JavaScript.
{% endhint %}

Now that you have the database installed, lets connect and start using it.

```typescript
import { Database, BaseModel } from "tydb";

class MyModel extends BaseModel {
    name: string = "alex";
    yearBorn: number = 1992;
}

const mydb = new Database<MyModel>({
    // database configuration
    // only the "ref" property is required
    ref: "mydb",
    model: MyModel
    // ... etc
});

/*
* Inserting a document based on the default
* values specified by the class above
*/
await mydb.insert([ MyModel.new({}) ]);

/*
* or ...
*/
await mydb.insert([ MyModel.new({ name: "john" }) ]);
await mydb.insert([ 
    MyModel.new({
        name: "john",  
    }),
    MyModel.new({
        _id: Math.random().toString(),
        name: "dina",
        yearBorn: 27
    })
]);

await mydb.delete({ filter: { name: "john" } });
```

The above example creates an in-memory-only database, so the data will not persisted and will be lost once the application is close or the instance is lost.

The following chart puts other ways to connect to a database into perspective:


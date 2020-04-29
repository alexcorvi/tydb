---
description: 'Math operators, field operators and array operators.'
---

# Update API

{% hint style="warning" %}
Although it is possible in MongoDB to use the direct field updates \(no operator, `{age:5}),`this is not supported in TyDB to enforce a more strict type declaration.
{% endhint %}

## Field operators

### `$set`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`**

```typescript
{
    $set: {
        <fieldName1>: <value1>,
        <fieldName2>: <value2>,
        ...etc
    }
}
```

**Explanation**: Sets the value of a field in a document.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* to age 5 and name: "alex"
*/

db.update({
    filter: {age: 1},
    update: {
        $set: {
            age: 5,
            name: "alex"
        }
    }
});
```
{% endtab %}
{% endtabs %}

### `$unset`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`**

```typescript
{
    $unset: {
        <fieldName1>: "",
        <fieldName2>: "",
        ...etc
    }
}
```

**Explanation**: Sets the specified field to `undefined`.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Sets the "lastLogin" field to undefiend
* for documents where age is 1
*/

db.update({
    filter: {age: 1},
    update: {
        $unset: {
            lastLogin: ""
        }
    }
});
```
{% endtab %}
{% endtabs %}

### `$setOnInsert`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`**

```typescript
{
    $setOnInsert: Model.new({ age: 3 }),
}
```

**Explanation**: If an `upsert` operation has resulted in an insert of a document, then `$setOnInsert` assigns the specified values to the fields in the document. If the update operation does not result in an insert, `$setOnInsert` does nothing. $setOnInsert can only take a full model, so you must use `Model.new({ ... props })` with it.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* to age 5 and name: "alex" if the
* document is found and inserts a
* new document with age 19 if the
* document was not found
*/

db.update({
    filter: {age: 1},
    update: {
        $set: {
            age: 5,
            name: "alex"
        },
        $setOnInsert: Model.new({ age: 19 })
    }
});
```
{% endtab %}
{% endtabs %}

### `$rename`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`**

```typescript
{
    $rename: {
        <fieldNameA>: <fieldNameB>,
        <fieldNameC>: <fieldNameD>,
        ...etc
    }
}
```

**Explanation**: renames the specified field to a new field name.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where "age"
* is more than 150 to "yearBorn"
*/

db.update({
    filter: { age: { $gt: 150 } },
    update: {
        $rename: {
            age: "yearBorn"
        }
    }
});
```
{% endtab %}
{% endtabs %}

### `$currentDate`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` or `Date`_._

**`Syntax:`**

```typescript
{
    $currentDate: {
        // sets the field to Date object
        // of the current date
        <fieldName1>: true,
        <fieldName2>: { $type: "date" },
        // sets the field to a timestamp
        // of the current date
        <fieldName3>: { $type: "timestamp" },
        ...etc
    }
}
```

**Explanation**: Sets the value of a field in a document to the current timestamp or Date object.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* to age 5 and reset the updatedAt
* and updatedTimestamp fields to
* the current date
*/

db.update({
    filter: {age: 1},
    update: {
        $set: {
            age: 5,
        },
        $currentDate: {
            // Date object
            updatedAt: true,
            // Timestamp
            updateTimestamp: { $type: "timestamp" }
        }
    }
});
```
{% endtab %}
{% endtabs %}

## Mathematical operators

### `$inc`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number`_._

**`Syntax:`**

```typescript
{
    $inc: {
        <fieldName1>: <number>,
        <fieldName2>: <number>,
        <fieldName3>: <number>,
        ... etc
    }
}
```

**Explanation**: Increments the value of the field by the specified amount.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* incrementing age by 5 
*/

db.update({
    filter: {age: 1},
    update: {
        $inc: {
            age: 5,
        },
    }
});
```
{% endtab %}
{% endtabs %}

### `$mul`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number`_._

**`Syntax:`**

```typescript
{
    $mul: {
        <fieldName1>: <number>,
        <fieldName2>: <number>,
        <fieldName3>: <number>,
        ... etc
    }
}
```

**Explanation**: Multiplies the value of the field by the specified number.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is negative
* to positive
*/

db.update({
    filter: {age: { $lt: 0 }},
    update: {
        $mul: {
            age: -1,
        },
    }
});
```
{% endtab %}
{% endtabs %}

### `$min`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` and `Date`_._

**`Syntax:`**

```typescript
{
    $min: {
        <fieldName1>: <value>,
        <fieldName2>: <value>,
        <fieldName3>: <value>,
        ... etc
    }
}
```

**Explanation**: Only updates the field if the specified value is less than the existing field value.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where name is "alex"
* and is age more than 5 
* to positive
*/

db.update({
    filter: {name: "alex"},
    update: {
        $min: {
            age: 5,
        },
    }
});
```
{% endtab %}
{% endtabs %}

### `$max`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` and `Date`_._

**`Syntax:`**

```typescript
{
    $max: {
        <fieldName1>: <value>,
        <fieldName2>: <value>,
        <fieldName3>: <value>,
        ... etc
    }
}
```

**Explanation**: Only updates the field if the specified value is more than the existing field value.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where name is "alex"
* and is age less than 5 
* to positive
*/

db.update({
    filter: {name: "alex"},
    update: {
        $max: {
            age: 5,
        },
    }
});
```
{% endtab %}
{% endtabs %}

## Array operators

### `$addToSet`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `Array`_._

**`Syntax:`**

```typescript
{
    $addToSet: {
        // adds a single value
        <fieldName1>: <value>,
        // adds multiple values
        <fieldName2>: {
            $each: [
                <value1>,
                <value2>,
                <value3>,
                ... etc
            ]
        }
    }
}
```

**Explanation**: Adds elements to an array only if they do not already exist in the set.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* by adding the tag "new"
* and adding couple of rooms
* if it doesn't already exist.
*/

db.update({
    filter: {age: 1},
    update: {
        $addToSet: {
            tags: "new",
            rooms: {
                $each: [
                    "room-a",
                    "room-b"
                ]
            }
        }
    }
});
```
{% endtab %}
{% endtabs %}

### `$pop`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `Array`_._

**`Syntax:`**

```typescript
{
    $pop: {
        // removes first element
        <fieldName1>: -1,
        // removes last element
        <fieldName2>: 1
    }
}
```

**Explanation**: removes the first or last element of an array. Pass $pop a value of -1 to remove the first element of an array and 1 to remove the last element in an array.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* removing last element of tags 
* and removes first element of rooms
*/

db.update({
    filter: {age: 1},
    update: {
        $pop: {
            tags: 1,
            rooms: -1
        }
    }
});
```
{% endtab %}
{% endtabs %}

### `$pull`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `Array`_._

**`Syntax:`**

```typescript
{
    $pull: {
        // remove by value
        <fieldName1>: <value>,
        // or remove by condition
        <fieldName2>: <query>
    }
}
```

**Explanation**: Removes all array elements that match a specified query or value.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* removing the room "room-c" 
* and removing any tag that has the letter "c"
*/

db.update({
    filter: {age: 1},
    update: {
        $pop: {
            tags: {
                $regex: /c/i
            },
            rooms: "room-c"
        }
    }
});
```
{% endtab %}
{% endtabs %}

### `$pullAll`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `Array`_._

**`Syntax:`**

```typescript
{
    $pop: {
        <fieldName1>: [<value1>, <value2> ... etc],
        <fieldName2>: [<value1>, <value2> ... etc],
        ... etc
    }
}
```

**Explanation**: The `$pullAll` operator removes all instances of the specified values from an existing array.

Unlike the `$pull` operator that removes elements by specifying a query, `$pullAll` removes elements that match the listed values.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* removing rooms: "room-a", "room-x" 
* and removes "new", "x-client"
*/

db.update({
    filter: {age: 1},
    update: {
        $pullAll: {
            tags: [ "new", "x-client" ],
            rooms: [ "room-a", "room-x" ]
        }
    }
});
```
{% endtab %}
{% endtabs %}

### `$push`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `Array`_._

**`Syntax:`**

```typescript
{
    $push: {
        <fieldName1>: <value>,
        // or
        <fieldName2>: {
        
            // multiple fields
            $each: [<value1>, <value2>, ...etc]
            
            // with modifiers
            // discussed below
            $slice: <number>,
            $position: <number>,
            $sort: <sort-specification>
            
        },
        ... etc
    }
}
```

**Explanation**: The `$push` operator appends a specified value to an array.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Update a document where age is 1
* by appending "new" to "tags"
*/

db.update({
    filter: {age: 1},
    update: {
        $push: {
            tags: "new"
        }
    }
});

// for examples regarding $push modifiers see below.
```
{% endtab %}
{% endtabs %}

## Array push modifiers

### `$each`

### `$slice`

### `$sort`

### `$position`








---
description: >-
  Field equality, comparison operators (at field level) and logical operators
  (at top level).
---

# Query API

The Query API is [very similar to MongoDB](https://docs.mongodb.com/manual/tutorial/query-documents/), You can select documents based on field equality or use comparison operators \(`$lt`, `$lte`, `$gt`, `$gte`, `$in`, `$nin`, `$ne`, `$eq`\). You can also use logical operators `$or`, `$and`, `$not` and `$where`.

## Field equality

To specify equality conditions, use `{ <FieldName> : <Value> }` expressions in the query filter document. This is the most basic and straight forward query.

An example of this query would go like this:

```typescript
// select all documents where the name is "ozzy"
db.find({ filter: {name: "ozzy"} });

// select all documents where
// the age is exactly 27
// and height is exactly 180
db.find({
    filter: {
        age: 27,
        height: 180
    }
});
```

## Field level operators

**`Syntax:`** `{ <fieldName>: { <operator>:<specification> } }`

### Comparison operators

#### Equal `$eq`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`** `{ <fieldName> : { $eq: <value> } }`.

**Explanation**: Specifies equality condition. The `$eq` operator matches documents where the value of a field equals the specified value. It is equivalent to `{ <FieldName> : <Value> }`.
{% endtab %}

{% tab title="Example" %}
```typescript
db.find({ filter: { name: { $eq: "ozzy" } } });
// same as:
db.find({ filter: { name: "ozzy" } });
```
{% endtab %}
{% endtabs %}

#### Not equal `$ne`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`** `{ <fieldName> : { $ne: <value> } }`.

**Explanation**: `$ne` selects the documents where the value of the field is not equal to the specified value. This includes documents that do not contain the field.
{% endtab %}

{% tab title="Example" %}
```typescript
// selecting all documents where "name"
// does not equal "ozzy"
db.find({ filter: { name: { $ne: "ozzy" } } });
```
{% endtab %}
{% endtabs %}

#### Greater than `$gt`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` & `Date` fields_._

**`Syntax:`** `{ <fieldName> : { $gt: <value> } }`.

**Explanation**: `$gt` selects those documents where the value of the field is greater than \(i.e. &gt;\) the specified value.
{% endtab %}

{% tab title="Example" %}
```typescript
// applied on a number field
db.find({ filter: { year: { $gt: 9 } } });

// applied on a date field
db.find({
    filter:{
        createdAt: { $gt: new Date(1588134729462) }
    }
});
```
{% endtab %}
{% endtabs %}

#### Less than `$lt`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` & `Date` fields_._

**`Syntax:`** `{ <fieldName> : { $lt: <value> } }`.

**Explanation**: `$lt` selects those documents where the value of the field is less than \(i.e. &lt;\) the specified value.
{% endtab %}

{% tab title="Example" %}
```typescript
// applied on a number field
db.find({ filter: { year: { $lt: 9 } } });

// applied on a date field
db.find({
    filter:{
        createdAt: { $lt: new Date(1588134729462) }
    }
});
```
{% endtab %}
{% endtabs %}

#### Greater than or equal `$gte`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` & `Date` fields_._

**`Syntax:`** `{ <fieldName> : { $gte: <value> } }`.

**Explanation**: `$gte` selects those documents where the value of the field is greater than or equal to \(i.e. &gt;=\) the specified value.
{% endtab %}

{% tab title="Example" %}
```typescript
// applied on a number field
db.find({ filter: { year: { $gte: 9 } } });

// applied on a date field
db.find({
    filter:{
        createdAt: { $gte: new Date(1588134729462) }
    }
});
```
{% endtab %}
{% endtabs %}

#### Less than or equal `$lte`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` & `Date` fields_._

**`Syntax:`** `{ <fieldName> : { $lte: <value> } }`.

**Explanation**: `$lte` selects those documents where the value of the field is less than or equal to \(i.e. &lt;=\) the specified value.
{% endtab %}

{% tab title="Example" %}
```typescript
// applied on a number field
db.find({ filter: { year: { $lte: 9 } } });

// applied on a date field
db.find({
    filter:{
        createdAt: { $lte: new Date(1588134729462) }
    }
});
```
{% endtab %}
{% endtabs %}

#### In `$in`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`** `{ <fieldName> : { $in: [<value1>, <value2>, ... etc] } }`.

**Explanation**: The `$in` operator selects the documents where the value of a field equals any value in the specified array.
{% endtab %}

{% tab title="Example" %}
```typescript
// find documents where the "name"
// field is one of the specified
// in the array
db.find({ filter: { name: { $in: ["alex", "john", "dina"] } } });
```
{% endtab %}
{% endtabs %}

#### Not in `$nin`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`** `{ <fieldName> : { $nin: [<value1>, <value2>, ... etc] } }`.

**Explanation**: `$nin` selects the documents where: the field value is not in the specified array or the field does not exist.
{% endtab %}

{% tab title="Example" %}
```typescript
// find documents where the "name"
// field value is not one of the
// specified values in the array
db.find({ filter: { name: { $in: ["alex", "john", "dina"] } } });
```
{% endtab %}
{% endtabs %}

### Element operators

#### Exists `$exists`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`** `{ <fieldName> : { $exists: <boolean> } }`.

**Explanation**: When `<boolean>` is true, `$exists` matches the documents that contain the field, including documents where the field value is `null`. If `<boolean>` is false, the query returns only the documents that do not contain the field.
{% endtab %}

{% tab title="Example" %}
```typescript
// select documents where the "name"
// field is defined, even if it is null
db.find({ filter: { name: { $exists: true } } });

// select documents where the "name"
// field is not defined
db.find({ filter: { name: { $exists: false} } });
```
{% endtab %}
{% endtabs %}

#### Type `$type`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** _any field type._

**`Syntax:`** `{ <fieldName> : { $type: <specification> } }`.

**Explanation**: `$type` selects documents where the _value_ of the `field` is an instance of the specified type. Type specification can be one of the following:

* `"string"`
* `"number"`
* `"boolean"`
* `"undefined"`
* `"array"`
* `"null"`
* `"date"`
* `"object"`

Although rare, but this is useful for when a field can have different type.
{% endtab %}

{% tab title="Example" %}
```typescript
// find documents where the "name" field
// is a string.
db.find({ filter: { name: { $type: "string" } } });
```
{% endtab %}
{% endtabs %}

### Evaluation operators

#### Modulo `$mod`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `number` & `Date` fields_._

**`Syntax:`** `{ <fieldName> : { $mod: [divisor, remainder] } }`.

**Explanation**: Select documents where the value of a field divided by a divisor has the specified remainder \(i.e. perform a modulo operation to select documents\).
{% endtab %}

{% tab title="Example" %}
```typescript
// select documents where the "years" field
// is an even number
db.find({ filter: {
    years: {
        $mod: [2,0]
    }
}});

// select documents where the "years" field
// is an odd number
db.find({ filter: {
    years: {
        $mod: [2,1]
    }
}});
```
{% endtab %}
{% endtabs %}

#### Regular expression testing `$regex`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `string` fields only**.**

**`Syntax:`** `{ <fieldName> : { $regex: <RegExp> } }`.

**Explanation**: Selects documents which tests `true` for a given regular expression.
{% endtab %}

{% tab title="Example" %}
```typescript
// select documents where the "name"
// field starts with either "a" or "A".
db.find({ filter: { name: { $regex: /^a/i } } });
```
{% endtab %}
{% endtabs %}

### Array operators

#### All contained `$all`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `array` fields only**.**

**`Syntax:`** `{ <fieldName> : { $all: [<value1>, <value2>,...etc] } }`.

**Explanation**: The `$all` operator selects the documents where the value of a field is an array that contains all the specified elements.
{% endtab %}

{% tab title="Example" %}
```typescript
// select documents where the "tags"
// field is an array that has "music" & "art"
db.find({ filter: { tags: { $all: [ "music", "art" ] } } });
```
{% endtab %}
{% endtabs %}

#### Element match `$elemMatch`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `array` fields only**.**

**`Syntax:`** `{<fieldName>:{$elemMatch:{<query1>,<query2>,...etc}}}`.

**Explanation**: The `$elemMatch` operator matches documents that contain an array field with at least one element that matches all the specified query criteria.
{% endtab %}

{% tab title="Example" %}
```typescript
// select documents where the "nums"
// field has an even number
// less than 8
// and greater than 0
db.find({
    filter: {
        nums: {
            $elemMatch: {
                $mod: [2, 0],
                $lt: 8,
                $gt: 0,
            }
        }
    }
});
```
{% endtab %}
{% endtabs %}

#### Size `$size`

{% tabs %}
{% tab title="Specification" %}
**Applies to:** `array` fields only**.**

**`Syntax:`** `{ <fieldName> : { $size: number } }`.

**Explanation**: The `$size` operator matches any array with the number of elements \(length of the array\) specified by the argument.
{% endtab %}

{% tab title="Example" %}
```typescript
// select documents where the "tags"
// field is an array that has 10 elements.
db.find({ filter: { tags: { $size: 10 } } });
```
{% endtab %}
{% endtabs %}

#### Field level operators on the array element

The array fields has the operators `$all`, `$elemMatch` and `$size` specific for them, nonetheless all the other aforementioned operators can be applied on the array, and would return true if any element in the array matches them.

* `$eq`: matches an array that has an element equal to the value specified by the operator.
* `$ne`: matches an array that has an element other than the value specified by the operator.
* `$gt`: matches an array of numbers that has a number greater than the value specified by the operator.
* `$lt`: matches an array of numbers that has a number less than the value specified by the operator.
* `$gte`: matches an array of numbers that has a number greater than or equals to the value specified by the operator.
* `$lte`: matches an array of numbers that has a number less than or equal to the value specified by the operator.
* `$in`: matches an array that has any of the values specified by the operator.
* `$nin`: matches an array that has none of the values specified by the operator.
* `$exists`: will match any given array.
* `$type`: will match the array if the specification for the operator is "array".
* `$mod`: matches an array if it has a number that when divided by the divider would given the remainder specified by the operator.
* `$regex`: matches an array of strings that has a string that would return true when tested by the regex given by this operator. 

## Top level operators

### `$and`

{% tabs %}
{% tab title="Specification" %}
**`Syntax:`**

```typescript
{
    $and: [
        <query1>,
        <query2>,
        <query3>,
        ...etc
    ]
}
```

**Explanation**: `$and` performs a logical `AND` operation on an array of two or more expressions \(e.g. `<field level query 1>`, `<field level query 2>` , etc.\) and selects the documents that satisfy all the expressions in the array. The `$and` operator uses short-circuit evaluation. If the first expression \(e.g. `<field level query 1>`\) evaluates to false, TyDB will not evaluate the remaining expressions.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Select a document where the name
* isn't equal to "alex" and the property exists
*/

db.find({ filter: {
    $and: [
        { $name: { $ne:"alex" } },
        { $name: { $exists: true } }
    ]
}})
```
{% endtab %}
{% endtabs %}

### `$nor`

{% tabs %}
{% tab title="Specification" %}
**`Syntax:`**

```typescript
{
    $nor: [
        <query1>,
        <query2>,
        <query3>,
        ...etc
    ]
}
```

**Explanation:** `$nor` performs a logical `NOR` operation on an array of one or more query expression and selects the documents that fail **all** the query expressions in the array.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Select a document where the "name" is not "alex"
* and the age is not 13
*/

db.find({ filter: {
    $nor: [
        { $name: "alex" },
        { $age: 13 }
    ]
}})
```
{% endtab %}
{% endtabs %}

### `$or`

{% tabs %}
{% tab title="Specification" %}
**`Syntax:`**

```typescript
{
    $or: [
        <query1>,
        <query2>,
        <query3>,
        ...etc
    ]
}
```

**Explanation:** The `$or` operator performs a logical `OR` operation on an array of two or more expressions and selects the documents that satisfy at least one of the expressions.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Select a document where the "name" is not "alex"
* or the age is not 13
*/

db.find({ filter: {
    $or: [
        { $name: "alex" },
        { $age: 13 }
    ]
}})
```
{% endtab %}
{% endtabs %}

### `$where`

{% tabs %}
{% tab title="Specification" %}
**`Syntax:`**

```typescript
{
    $where: (this: Model) => boolean
}
```

**Explanation:** Matches the documents that when evaluated by the given function, would return `true`. _\*\*_The `$where` provides greater flexibility, but requires that the database processes the JavaScript expression or function for each document in the collection. Reference the document in the JavaScript expression or function using `this`.
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Select a document where the "name"
* is 5 charecters long and ends with "x"
*/

db.find({ filter: {
    $where: function () {
        // DO NOT use arrow function here
        return this.name.length === 5 && this.name.endsWith("x");    
    }
}})
```
{% endtab %}
{% endtabs %}

### `$deep`

{% tabs %}
{% tab title="Specification" %}
**`Syntax:`**

```typescript
{
    $deep: {
        "an.embedded.document.field": <query>
    }
}
```

**Explanation:** This is the only operator that TyDB offers while MongoDB doesn't. Use this operator when trying to apply a query on a deeply nested properties \(i.e. embedded documents\), like: `"employee.address.street"`.

{% hint style="info" %}
This operator is not strongly typed, as the typescript compiler is unable to decide what would be the type of a dot noted deeply nested field. In fact, this limitation is the reason for placing dot notation access to field in a separate operator, since placing them at the top level would disable all type checks performed by typescript.

Due to this limitation, although it is perfectly supported, It is strongly advised to avoid embedded documents when possible.
{% endhint %}
{% endtab %}

{% tab title="Example" %}
```typescript
/**
* Select a document where it has a "name" object,
* which have "first" and "last" properties.
* "first" property must be either "alex" or "john".
* "last" property must be either "corvi" or "cena"
*/

db.find({ filter: {
    $deep: {
        "name.first": {
            $in: ["alex", "john"]
        },
        "name.last": {
            $in: ["corvi", "cena"]
        }
    }
}})
```
{% endtab %}
{% endtabs %}


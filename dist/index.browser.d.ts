/// <reference types="glob" />
import Q from "p-queue";
declare namespace customUtils {
    function uid(): string;
    function randomString(len: number): string;
    /**
     * Return an array with the numbers from 0 to n-1, in a random order
     */
    function getRandomArray(n: number): number[];
}
declare namespace model {
    interface keyedObject {
        [key: string]: Value;
    }
    type PrimitiveValue = number | string | boolean | undefined | null | Date;
    type Value = keyedObject | Array<PrimitiveValue | keyedObject> | PrimitiveValue; /**
     * Check a key throw an error if the key is non valid
     * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
     * Its serialized-then-deserialized version it will transformed into a Date object
     * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
     */
    /**
     * Check a key throw an error if the key is non valid
     * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
     * Its serialized-then-deserialized version it will transformed into a Date object
     * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
     */
    /**
     * Check a key throw an error if the key is non valid
     * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
     * Its serialized-then-deserialized version it will transformed into a Date object
     * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
     */
    /**
     * Check a DB object and throw an error if it's not valid
     * Works by applying the above checkKey function to all fields recursively
     */
    function checkObject(obj: Value): void;
    /**
     * Serialize an object to be persisted to a one-line string
     * For serialization/deserialization, we use the native JSON parser and not eval or Function
     * That gives us less freedom but data entered in the database may come from users
     * so eval and the like are not safe
     * Accepted primitive types: Number, String, Boolean, Date, null
     * Accepted secondary types: Objects, Arrays
     */
    function serialize<T>(obj: T): string;
    /**
     * From a one-line representation of an object generate by the serialize function
     * Return the object itself
     */
    function deserialize(rawData: string): any;
    /**
     * Deep copy a DB object
     * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
     * where the keys are valid, i.e. don't begin with $ and don't contain a .
     */
    function deepCopy<T>(obj: T, model: (new () => any) & {
        new: (json: any) => any;
    }, strictKeys?: boolean): T;
    /**
     * Tells if an object is a primitive type or a "real" object
     * Arrays are considered primitive
     */
    function isPrimitiveType(obj: Value): boolean;
    /**
     * Utility functions for comparing things
     * Assumes type checking was already done (a and b already have the same type)
     * compareNSB works for numbers, strings and booleans
     */
    type NSB = number | string | boolean;
    function compareNSB<T extends NSB>(a: T, b: T): 0 | 1 | -1;
    function compareThings<V>(a: V, b: V, _compareStrings?: typeof compareNSB): 0 | 1 | -1; // ==============================================================
    // Updating documents
    // ==============================================================
    /**
     * The signature of modifier functions is as follows
     * Their structure is always the same: recursively follow the dot notation while creating
     * the nested documents if needed, then apply the "last step modifier"
     */
    // ==============================================================
    // Updating documents
    // ==============================================================
    /**
     * The signature of modifier functions is as follows
     * Their structure is always the same: recursively follow the dot notation while creating
     * the nested documents if needed, then apply the "last step modifier"
     */
    // ==============================================================
    // Updating documents
    // ==============================================================
    /**
     * The signature of modifier functions is as follows
     * Their structure is always the same: recursively follow the dot notation while creating
     * the nested documents if needed, then apply the "last step modifier"
     */
    /**
     * Modify a DB object according to an update query
     */
    function modify<G extends {
        _id?: string;
    }>(obj: G, updateQuery: any, model: (new () => G) & {
        new: (json: G) => G;
    }): G;
    // ==============================================================
    // Finding documents
    // ==============================================================
    /**
     * Get a value from object with dot notation
     */
    function getDotValue(obj: any, field: string): any;
    function areThingsEqual<A, B>(a: A, b: B): boolean; /**
     * Check that two values are comparable
     */
    /**
     * Check that two values are comparable
     */
    /**
     * Check that two values are comparable
     */
    function match(obj: any, query: any): boolean; /**
     * Match an object against a specific { key: value } part of a query
     * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
     */
    /**
     * Match an object against a specific { key: value } part of a query
     * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
     */
    /**
     * Match an object against a specific { key: value } part of a query
     * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
     */
}
declare class BaseModel<T = any> {
    _id: string;
    updatedAt?: Date;
    createdAt?: Date;
    static new<T>(this: new () => T, data: Partial<NFP<T>>): T;
}
type NFPN<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
type NFP<T> = Pick<T, NFPN<T>>;
type Keys<O> = keyof O;
type Partial<T> = {
    [P in keyof T]?: T[P];
};
interface AnyFieldLevelQueryOperators<V> {
    $type?: "string" | "number" | "boolean" | "undefined" | "array" | "null" | "date" | "object";
    /**
     * Specifies equality condition. The $eq operator matches documents where the value of a field equals the specified value.
     * {field: { $eq: <value> }}
     */
    $eq?: V;
    /**
     * $gt selects those documents where the value of the field is greater than (i.e. >) the specified value.
     * {field: {$gt:value}}
     */
    $gt?: V;
    /**
     * $gte selects the documents where the value of the field is greater than or equal to (i.e. >=) a specified value
     * {field: {$gte:value}}
     */
    $gte?: V;
    /**
     * The $in operator selects the documents where the value of a field equals any value in the specified array.
     * { field: { $in: [<value1>, <value2>, ... <valueN> ] } }
     */
    $in?: V[];
    /**
     * $lt selects the documents where the value of the field is less than (i.e. <) the specified value.
     * {field: {$lt:value}}
     */
    $lt?: V;
    /**
     * $lte selects the documents where the value of the field is less than or equal to (i.e. <=) the specified value.
     * {field: {$lte:value}}
     */
    $lte?: V;
    /**
     * $ne selects the documents where the value of the field is not equal (i.e. !=) to the specified value. This includes documents that do not contain the field.
     * {field: {$ne:value}}
     */
    $ne?: V;
    /**
     * $nin selects the documents where: the field value is not in the specified array or the field does not exist.
     * { field: { $nin: [ <value1>, <value2> ... <valueN> ]} }
     */
    $nin?: V[];
    /**
     * $not performs a logical NOT operation on the specified <operator-expression> and selects the documents that do not match the <operator-expression>. This includes documents that do not contain the field.
     * { field: { $not: { <operator-expression> } } }
     */
    $not?: AnyFieldLevelQueryOperators<V>;
    /**
     * When <boolean> is true, $exists matches the documents that contain the field, including documents where the field value is null. If <boolean> is false, the query returns only the documents that do not contain the field.
     * { field: { $exists: <boolean> } }
     */
    $exists?: boolean;
    /**
     * Select documents where the value of a field divided by a divisor has the specified remainder (i.e. perform a modulo operation to select documents). To specify a $mod expression, use the following syntax:
     * { field: { $mod: [ divisor, remainder ] } }
     */
    $mod?: [number, number];
    /**
     * Provides regular expression capabilities for pattern matching strings in queries. MongoDB uses Perl compatible regular expressions (i.e. “PCRE” ) version 8.41 with UTF-8 support.
     * {field:{$regex: /pattern/<options>}}
     */
    $regex?: RegExp;
}
interface ArrayFieldLevelQueryOperators<V> extends AnyFieldLevelQueryOperators<V> {
    /**
     * The $all operator selects the documents where the value of a field is an array that contains all the specified elements.
     *{ field: { $all: [ <value1> , <value2> ... ] } }
     */
    $all?: Array<V>;
    /**
     * The $elemMatch operator matches documents that contain an array field with at least one element that matches all the specified query criteria.
     * { <field>: { $elemMatch: { <query1>, <query2>, ... } } }
     */
    $elemMatch?: AnyFieldLevelQueryOperators<V>;
    /**
     * The $size operator matches any array with the number of elements specified by the argument. For example:{ field: { $size: 2 } }
     */
    $size?: number;
    /**
     * $not performs a logical NOT operation on the specified <operator-expression> and selects the documents that do not match the <operator-expression>. This includes documents that do not contain the field.
     * { field: { $not: { <operator-expression> } } }
     */
    $not?: ArrayFieldLevelQueryOperators<V>;
}
interface TopLevelQueryOperators<S> {
    /**
     * $and performs a logical AND operation on an array of two or more expressions (e.g. <expression1>, <expression2>, etc.) and selects the documents that satisfy all the expressions in the array. The $and operator uses short-circuit evaluation. If the first expression (e.g. <expression1>) evaluates to false, MongoDB will not evaluate the remaining expressions.
     * { $and: [ { <expression1> }, { <expression2> } , ... , { <expressionN> } ] }
     */
    $and?: SchemaKeyFilters<S>[];
    /**
     * $nor performs a logical NOR operation on an array of one or more query expression and selects the documents that fail all the query expressions in the array. The $nor has the following syntax:
     * { $nor: [ { <expression1> }, { <expression2> }, ...  { <expressionN> } ] }
     */
    $nor?: SchemaKeyFilters<S>[];
    /**
     * The $or operator performs a logical OR operation on an array of two or more <expressions> and selects the documents that satisfy at least one of the <expressions>. The $or has the following syntax:
     * { $or: [ { <expression1> }, { <expression2> }, ... , { <expressionN> } ] }
     */
    $or?: SchemaKeyFilters<S>[];
    /**
     * Use the $where operator to pass either a string containing a JavaScript function to the query system. The $where provides greater flexibility, but requires that the database processes the JavaScript expression or function for each document in the collection. Reference the document in the JavaScript expression or function using this.
     */
    $where?: (this: S) => boolean;
    /**
     * Use this operator when trying to apply filter on a deeply nested properties, like: "employee.address.street".
     * {$deep: {"employee.address.street": {$eq: "Bedford Mount"}}}
     */
    $deep?: {
        [key: string]: SchemaKeyFilters<any>;
    };
}
type SchemaKeyFilters<S> = Partial<{
    [key in Keys<S>]: (S[key] extends Array<any> ? ArrayFieldLevelQueryOperators<S[key][0]> : AnyFieldLevelQueryOperators<S[key]>) | S[key];
}>;
type Filter<S> = SchemaKeyFilters<S> | TopLevelQueryOperators<S>;
type SchemaKeySort<S> = Partial<{
    [key in Keys<S>]: -1 | 1;
} & {
    $deep: {
        [key: string]: -1 | 1;
    };
}>;
type SchemaKeyProjection<S> = Partial<{
    [key in Keys<S>]: 0 | 1;
} & {
    $deep: {
        [key: string]: 0 | 1;
    };
}>;
interface PushModifiers<V> {
    /**
     * Modifies the $push and $addToSet operators to append multiple items for array updates.
     * { ($addToSet|$push): { <field>: { $each: [ <value1>, <value2> ... ] } } }
     */
    $each: V[];
    /**
     * Modifies the $push operator to limit the size of updated arrays.
     * {$push: {<field>: {$each: [ <value1>, <value2>, ... ],$slice: <num>}}}
     */
    $slice?: number;
    /**
     * The $sort modifier orders the elements of an array during a $push operation. To use the $sort modifier, it must appear with the $each modifier.
     * You can pass an empty array [] to the $each modifier such that only the $sort modifier has an effect.
     * {$push: {<field>: {$each: [ <value1>, <value2>, ... ],$sort: <sort specification>}}}
     */
    $sort?: 1 | -1 | Partial<{
        [Key in Keys<V>]: 1 | -1;
    }>;
    /**
     * The $position modifier specifies the location in the array at which the $push operator insert elements. Without the $position modifier, the $push operator inserts elements to the end of the array.
     */
    $position?: number;
}
interface UpsertOperators<S> extends UpdateOperators<S> {
    /**
     * If an update operation with upsert: true results in an insert of a document, then $setOnInsert assigns the specified values to the fields in the document. If the update operation does not result in an insert, $setOnInsert does nothing.
     * { $setOnInsert: { <field1>: <value1>, ... } },
     *
     */
    $setOnInsert: Partial<S>;
}
interface UpdateOperators<S> {
    /**
     * Increments the value of the field by the specified amount.
     * { $inc: { <field1>: <amount1>, <field2>: <amount2>, ... } }
     */
    $inc?: UpdateOperatorsOnSchema<S, number>;
    /**
     * Multiplies the value of the field by the specified amount.
     * { $mul: { field: <number> } }
     */
    $mul?: UpdateOperatorsOnSchema<S, number>;
    /**
     * Renames a field.
     * {$rename: { <field1>: <newName1>, <field2>: <newName2>, ... } }
     */
    $rename?: UpdateOperatorsOnSchema<S, string>;
    /**
     * Sets the value of a field in a document.
     * { $set: { <field1>: <value1>, ... } }
     */
    $set?: Partial<S & {
        $deep: {
            [key: string]: any;
        };
    }>;
    /**
     * Removes the specified field from a document.
     * { $unset: { <field1>: "", ... } }
     */
    $unset?: Partial<{
        [key in Keys<S>]: "";
    } & {
        $deep: {
            [key: string]: any;
        };
    }>;
    /**
     * Only updates the field if the specified value is less than the existing field value.
     * { $min: { <field1>: <value1>, ... } }
     */
    $min?: Partial<S>;
    /**
     * Only updates the field if the specified value is greater than the existing field value.
     * { $max: { <field1>: <value1>, ... } }
     */
    $max?: Partial<S>;
    /**
     * Sets the value of a field to current date, either as a Date or a Timestamp.
     * { $currentDate: { <field1>: <typeSpecification1>, ... } }
     */
    $currentDate?: UpdateOperatorsOnSchema<S, true | {
        $type: "timestamp" | "date";
    }>;
    /**
     * Adds elements to an array only if they do not already exist in the set.
     * { $addToSet: { <field1>: <value1>, ... } }
     */
    $addToSet?: Partial<{
        [Key in Keys<S>]: S[Key] extends Array<infer U> ? U | {
            $each: U[];
        } : never;
    }>;
    /**
     * The $pop operator removes the first or last element of an array. Pass $pop a value of -1 to remove the first element of an array and 1 to remove the last element in an array.
     * { $pop: { <field>: <-1 | 1>, ... } }
     */
    $pop?: Partial<{
        [Key in Keys<S>]: S[Key] extends Array<infer U> ? -1 | 1 : never;
    }>;
    /**
     * Removes all array elements that match a specified query.
     * { $pull: { <field1>: <value|condition>, <field2>: <value|condition>, ... } }
     */
    $pull?: Partial<{
        [Key in Keys<S>]: S[Key] extends Array<infer U> ? Partial<U> | AnyFieldLevelQueryOperators<U> : never;
    }>;
    /**
     * The $pullAll operator removes all instances of the specified values from an existing array. Unlike the $pull operator that removes elements by specifying a query, $pullAll removes elements that match the listed values.
     * { $pullAll: { <field1>: [ <value1>, <value2> ... ], ... } }
     */
    $pullAll?: Partial<{
        [Key in Keys<S>]: S[Key] extends Array<infer U> ? U[] : never;
    }>;
    /**
     * The $push operator appends a specified value to an array.
     * { $push: { <field1>: <value1>, ... } }
     */
    $push?: Partial<{
        [Key in Keys<S>]: S[Key] extends Array<infer U> ? U | PushModifiers<U> : never;
    }>;
}
type UpdateOperatorsOnSchema<S, V> = Partial<{
    [key in Keys<S>]: V;
}>;
/**
 * Create a new cursor for this collection
 */
declare class Cursor<G extends {
    _id?: string;
}> {
    private db;
    private query;
    private _limit;
    private _skip;
    private _sort;
    private _projection;
    constructor(db: Datastore<G>, query?: any);
    /**
     * Set a limit to the number of results
     */
    limit(limit: number): this;
    /**
     * Skip a the number of results
     */
    skip(skip: number): this;
    /**
     * Sort results of the query
     */
    sort(sortQuery: SchemaKeySort<G>): this;
    /**
     * Add the use of a projection
     */
    projection(projection: SchemaKeyProjection<G>): this;
    /**
     * Apply the projection
     */
    private _project;
    /**
     * Get all matching elements
     * Will return pointers to matched elements (shallow copies), returning full copies is the role of find or findOne
     *
     */
    __exec_unsafe(): Promise<G[]>;
    private _exec;
    exec(): Promise<G[]>;
}
declare namespace utils {
    /*
    * Default compareKeys function will work for numbers, strings and dates
    */
    function defaultCompareKeysFunction<NSD>(a: NSD, b: NSD): number;
    /**
     * Check whether two values are equal (used in non-unique deletion)
     */
    function defaultCheckValueEquality<T>(a: T, b: T): boolean;
    function isDef(v: any): boolean;
}
interface initializationOptions<K, V> {
    key?: K;
    value?: V;
    unique?: boolean;
    compareKeys?: typeof utils.defaultCompareKeysFunction;
    checkValueEquality?: typeof utils.defaultCheckValueEquality;
}
interface AVLOptions<K, V> extends initializationOptions<K, V> {
    left?: Node<K, V>;
    right?: Node<K, V>;
    parent?: Node<K, V>;
}
interface BSTOptions<K, V> extends initializationOptions<K, V> {
    left?: BST<K, V>;
    right?: BST<K, V>;
    parent?: BST<K, V>;
}
declare namespace utils {
    /*
    * Default compareKeys function will work for numbers, strings and dates
    */
    function defaultCompareKeysFunction<NSD>(a: NSD, b: NSD): number;
    /**
     * Check whether two values are equal (used in non-unique deletion)
     */
    function defaultCheckValueEquality<T>(a: T, b: T): boolean;
    function isDef(v: any): boolean;
}
/**
 * Simple binary search tree
 */
declare class BST<K, V> {
    left: BST<K, V> | undefined;
    right: BST<K, V> | undefined;
    parent: BST<K, V> | undefined;
    key: K | undefined;
    data: V[];
    unique: boolean;
    compareKeys: typeof utils.defaultCompareKeysFunction;
    checkValueEquality: typeof utils.defaultCheckValueEquality;
    constructor(init?: BSTOptions<K, V>);
    /**
     * Get the descendant with max key
     */
    getMaxKeyDescendant(): BST<K, V>;
    /**
     * Get the maximum key
     */
    getMaxKey(): K | undefined;
    /**
     * Get the descendant with min key
     */
    getMinKeyDescendant(): BST<K, V>;
    /**
     * Get the minimum key
     */
    getMinKey(): K | undefined;
    /**
     * Check that all nodes (incl. leaves) fullfil condition given by fn
     * test is a function passed every (key, data) and which throws if the condition is not met
     */
    forEach(test: (key: K | undefined, value: V[]) => any): void;
    /**
     * Check that the core BST properties on node ordering are verified
     * Throw if they aren't
     */
    checkNodeOrdering(): void;
    /**
     * Check that all pointers are coherent in this tree
     */
    checkInternalPointers(): void;
    /**
     * Check that a tree is a BST as defined here (node ordering and pointer references)
     */
    checkIsBST(): void;
    /**
     * Get number of keys inserted
     */
    getNumberOfKeys(): number;
    // ============================================
    // Methods used to actually work on the tree
    // ============================================
    /**
     * Create a BST similar (i.e. same options except for key and value) to the current one
     * Use the same constructor (i.e. BinarySearchTree, AVLTree etc)
     */
    createSimilar(this: any, options?: BSTOptions<K, V>): any;
    /**
     * Create the left child of this BST and return it
     */
    createLeftChild(options: BSTOptions<K, V>): any;
    /**
     * Create the right child of this BST and return it
     */
    createRightChild(options: BSTOptions<K, V>): any;
    /**
     * Insert a new element
     */
    insert(key: K, value?: V): void;
    /**
     * Search for all data corresponding to a key
     */
    search(key: K): V[];
    /**
     * Search for data coming right after a specific key
     */
    searchAfter(key: K): V[];
    /**
     * Search for data coming right before a specific key
     */
    searchBefore(key: K): V[];
    /**
     * Search for all data corresponding to a specific key, if that key
     * does not exist, find the nearest key less than the specified key and its
     * associated data. Returns undefined if no such key&data can be found.
     **/
    searchNearestLte(key: K): V[] | undefined;
    private _searchNearestLte;
    /**
     * Search for all data corresponding to a specific key, if that key
     * does not exist, find the nearest key greater than the specified key and its
     * associated data. Returns undefined if no such key&data can be found.
     **/
    searchNearestGte(key: K): V[] | undefined;
    private _searchNearestGte;
    /**
     * Search for all data corresponding to a specific key, if that key
     * does not exist, find the nearest key and associated data.
     */
    searchNearest(key: K): V[] | undefined;
    private _searchNearest;
    /**
     * Return a function that tells whether a given key matches a lower bound
     */
    getLowerBoundMatcher(query: any): (key: K) => boolean;
    /**
     * Return a function that tells whether a given key matches an upper bound
     */
    getUpperBoundMatcher(query: any): (key: K) => boolean;
    /**
     * Get all data for a key between bounds
     * Return it in key order
     */
    betweenBounds(query: any, lbm: BST<K, V>["getLowerBoundMatcher"], ubm: BST<K, V>["getLowerBoundMatcher"]): V[];
    /**
     * Delete the current node if it is a leaf
     * Return true if it was deleted
     */
    deleteIfLeaf(): boolean;
    /**
     * Delete the current node if it has only one child
     * Return true if it was deleted
     */
    deleteIfOnlyOneChild(): boolean;
    /**
     * Delete a key or just a value
     */
    delete(key: K, value?: V): void;
    /**
     * Execute a function on every node of the tree, in key order
     */
    executeOnEveryNode(fn: (bst: BST<K, V>) => void): void;
    /**
     * Pretty print a tree
     */
    prettyPrint(printData: boolean, spacing?: string): void;
}
declare namespace utils {
    /*
    * Default compareKeys function will work for numbers, strings and dates
    */
    function defaultCompareKeysFunction<NSD>(a: NSD, b: NSD): number;
    /**
     * Check whether two values are equal (used in non-unique deletion)
     */
    function defaultCheckValueEquality<T>(a: T, b: T): boolean;
    function isDef(v: any): boolean;
}
/**
 * Self-balancing binary search tree using the AVL implementation
 */
declare class AVLTree<K, V> {
    tree: Node<K, V>;
    constructor(options?: AVLOptions<K, V>);
    checkIsAVLT(): void;
    // Insert in the internal tree, update the pointer to the root if needed
    insert(key: K, value: V): void;
    // Delete a value
    delete(key: K, value?: V): void;
    getNumberOfKeys(): number;
    getMinKey(): K | undefined;
    getMaxKey(): K | undefined;
    search(key: K): V[];
    searchAfter(k: K): V[];
    searchBefore(k: K): V[];
    searchNearest(k: K): V[] | undefined;
    searchNearestLte(k: K): V[] | undefined;
    searchNearestGte(k: K): V[] | undefined;
    betweenBounds(query: any, lbm?: (query: any) => (key: K) => boolean, ubm?: (query: any) => (key: K) => boolean): V[];
    prettyPrint(printData: boolean, spacing?: string): void;
    executeOnEveryNode(fn: (bst: BST<K, V>) => void): void;
} /**
 * Node
 */
/**
 * Node
 */
declare class Node<K, V> extends BST<K, V> {
    left: Node<K, V> | undefined;
    right: Node<K, V> | undefined;
    parent: Node<K, V> | undefined;
    key: K | undefined;
    data: V[];
    unique: boolean;
    compareKeys: typeof utils.defaultCompareKeysFunction;
    checkValueEquality: typeof utils.defaultCheckValueEquality;
    height: number;
    constructor(init?: AVLOptions<K, V>);
    /**
     * Check the recorded height is correct for every node
     * Throws if one height doesn't match
     */
    checkHeightCorrect(): void;
    /**
     * Return the balance factor
     */
    balanceFactor(): number;
    /**
     * Check that the balance factors are all between -1 and 1
     */
    checkBalanceFactors(): void;
    /**
     * When checking if the BST conditions are met, also check that the heights are correct
     * and the tree is balanced
     */
    checkIsAVLT(): void;
    /**
     * Perform a right rotation of the tree if possible
     * and return the root of the resulting tree
     * The resulting tree's nodes' heights are also updated
     */
    rightRotation(): Node<K, V>;
    /**
     * Perform a left rotation of the tree if possible
     * and return the root of the resulting tree
     * The resulting tree's nodes' heights are also updated
     */
    leftRotation(): Node<K, V>;
    /**
     * Modify the tree if its right subtree is too small compared to the left
     * Return the new root if any
     */
    rightTooSmall(): Node<K, V>;
    /**
     * Modify the tree if its left subtree is too small compared to the right
     * Return the new root if any
     */
    leftTooSmall(): Node<K, V>;
    /**
     * Rebalance the tree along the given path. The path is given reversed (as he was calculated
     * in the insert and delete functions).
     * Returns the new root of the tree
     * Of course, the first element of the path must be the root of the tree
     */
    rebalanceAlongPath(path: Node<K, V>[]): Node<K, V>;
    /**
     * Insert a key, value pair in the tree while maintaining the AVL tree height constraint
     * Return a pointer to the root node, which may have changed
     */
    insert(key: K, value: V): Node<K, V>;
    /**
     * Delete a key or just a value and return the new root of the tree
     */
    delete(key: K, value?: V): Node<K, V>;
}
declare namespace model {
    interface keyedObject {
        [key: string]: Value;
    }
    type PrimitiveValue = number | string | boolean | undefined | null | Date;
    type Value = keyedObject | Array<PrimitiveValue | keyedObject> | PrimitiveValue; /**
     * Check a key throw an error if the key is non valid
     * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
     * Its serialized-then-deserialized version it will transformed into a Date object
     * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
     */
    /**
     * Check a DB object and throw an error if it's not valid
     * Works by applying the above checkKey function to all fields recursively
     */
    function checkObject(obj: Value): void;
    /**
     * Serialize an object to be persisted to a one-line string
     * For serialization/deserialization, we use the native JSON parser and not eval or Function
     * That gives us less freedom but data entered in the database may come from users
     * so eval and the like are not safe
     * Accepted primitive types: Number, String, Boolean, Date, null
     * Accepted secondary types: Objects, Arrays
     */
    function serialize<T>(obj: T): string;
    /**
     * From a one-line representation of an object generate by the serialize function
     * Return the object itself
     */
    function deserialize(rawData: string): any;
    /**
     * Deep copy a DB object
     * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
     * where the keys are valid, i.e. don't begin with $ and don't contain a .
     */
    function deepCopy<T>(obj: T, model: (new () => any) & {
        new: (json: any) => any;
    }, strictKeys?: boolean): T;
    /**
     * Tells if an object is a primitive type or a "real" object
     * Arrays are considered primitive
     */
    function isPrimitiveType(obj: Value): boolean;
    /**
     * Utility functions for comparing things
     * Assumes type checking was already done (a and b already have the same type)
     * compareNSB works for numbers, strings and booleans
     */
    type NSB = number | string | boolean;
    function compareNSB<T extends NSB>(a: T, b: T): 0 | 1 | -1;
    function compareThings<V>(a: V, b: V, _compareStrings?: typeof compareNSB): 0 | 1 | -1; // ==============================================================
    // Updating documents
    // ==============================================================
    /**
     * The signature of modifier functions is as follows
     * Their structure is always the same: recursively follow the dot notation while creating
     * the nested documents if needed, then apply the "last step modifier"
     */
    /**
     * Modify a DB object according to an update query
     */
    function modify<G extends {
        _id?: string;
    }>(obj: G, updateQuery: any, model: (new () => G) & {
        new: (json: G) => G;
    }): G;
    // ==============================================================
    // Finding documents
    // ==============================================================
    /**
     * Get a value from object with dot notation
     */
    function getDotValue(obj: any, field: string): any;
    function areThingsEqual<A, B>(a: A, b: B): boolean; /**
     * Check that two values are comparable
     */
    function match(obj: any, query: any): boolean; /**
     * Match an object against a specific { key: value } part of a query
     * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
     */
}
interface Pair<Doc> {
    newDoc: Doc;
    oldDoc: Doc;
} /**
 * Two indexed pointers are equal iif they point to the same place
 */
declare function checkValueEquality<T>(a: T, b: T): boolean; /**
 * Type-aware projection
 */
/**
 * Type-aware projection
 */
/**
 * Type-aware projection
 */
declare class Index<Key, Doc extends Partial<BaseModel>> {
    fieldName: string;
    unique: boolean;
    sparse: boolean;
    treeOptions: {
        unique: boolean;
        compareKeys: typeof model.compareThings;
        checkValueEquality: typeof checkValueEquality;
    };
    tree: AVLTree<Key, Doc>;
    constructor({ fieldName, unique, sparse }: {
        fieldName: string;
        unique?: boolean;
        sparse?: boolean;
    });
    reset(): void;
    /**
     * Insert a new document in the index
     * If an array is passed, we insert all its elements (if one insertion fails the index is not modified)
     * O(log(n))
     */
    insert(doc: Doc | Doc[]): void;
    /**
     * Insert an array of documents in the index
     * If a constraint is violated, the changes should be rolled back and an error thrown
     *
     */
    private insertMultipleDocs;
    /**
     * Remove a document from the index
     * If an array is passed, we remove all its elements
     * The remove operation is safe with regards to the 'unique' constraint
     * O(log(n))
     */
    remove(doc: Doc | Doc[]): void;
    /**
     * Update a document in the index
     * If a constraint is violated, changes are rolled back and an error thrown
     * Naive implementation, still in O(log(n))
     */
    update(oldDoc: Doc | Array<Pair<Doc>>, newDoc?: Doc): void;
    /**
     * Update multiple documents in the index
     * If a constraint is violated, the changes need to be rolled back
     * and an error thrown
     */
    private updateMultipleDocs;
    /**
     * Revert an update
     */
    revertUpdate(oldDoc: Doc | Array<Pair<Doc>>, newDoc?: Doc): void;
    /**
     * Get all documents in index whose key match value (if it is a Thing) or one of the elements of value (if it is an array of Things)
     */
    getMatching(key: Key): Doc[];
    getAll(): Doc[];
    getBetweenBounds(query: any): Doc[];
}
type PersistenceEventCallback = (message: string) => Promise<void>;
type PersistenceEventEmits = "readLine" | "writeLine" | "end";
declare class PersistenceEvent {
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
} /**
 * Create a new Persistence object for database options.db
 */
/**
 * Create a new Persistence object for database options.db
 */
declare class Persistence<G extends Partial<BaseModel> = any> {
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
    forcefulUnlock(): Promise<void>;
}
declare namespace types { }
interface EnsureIndexOptions {
    fieldName: string;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
}
interface DataStoreOptions<G> {
    ref: string;
    afterSerialization?(line: string): string;
    beforeDeserialization?(line: string): string;
    corruptAlertThreshold?: number;
    timestampData?: boolean;
    persistence_adapter?: typeof Persistence;
    model?: (new () => G) & {
        new: (json: G) => G;
    };
}
interface UpdateOptions {
    multi?: boolean;
    upsert?: boolean;
}
declare class Datastore<G extends Partial<types.BaseModel> & {
    [key: string]: any;
}> {
    ref: string;
    timestampData: boolean;
    persistence: Persistence<G>;
    // rename to something denotes that it's an internal thing
    q: Q;
    indexes: {
        [key: string]: Index<string, G>;
    };
    ttlIndexes: {
        [key: string]: number;
    };
    model: (new () => G) & {
        new: (json: G) => G;
    };
    constructor(options: DataStoreOptions<G>);
    /**
     * Load the database from the datafile, and trigger the execution of buffered commands if any
     */
    loadDatabase(): Promise<boolean>;
    /**
     * Get an array of all the data in the database
     */
    getAllData(): G[];
    /**
     * Reset all currently defined indexes
     */
    resetIndexes(): void;
    /**
     * Ensure an index is kept for this field. Same parameters as lib/indexes
     * For now this function is synchronous, we need to test how much time it takes
     * We use an async API for consistency with the rest of the code
     */
    ensureIndex(options: EnsureIndexOptions): Promise<{
        affectedIndex: string;
    }>;
    /**
     * Remove an index
     */
    removeIndex(fieldName: string): Promise<{
        affectedIndex: string;
    }>;
    /**
     * Add one or several document(s) to all indexes
     */
    addToIndexes<T extends G>(doc: T | T[]): void;
    /**
     * Remove one or several document(s) from all indexes
     */
    removeFromIndexes<T extends G>(doc: T | T[]): void;
    /**
     * Update one or several documents in all indexes
     * To update multiple documents, oldDoc must be an array of { oldDoc, newDoc } pairs
     * If one update violates a constraint, all changes are rolled back
     */
    updateIndexes<T extends G>(oldDoc: T, newDoc: T): void;
    updateIndexes<T extends G>(updates: Array<{
        oldDoc: T;
        newDoc: T;
    }>): void;
    private _isBasicType;
    /**
     * This will return the least number of candidates,
     * using Index if possible
     * when failing it will return all the database
     */
    private _leastCandidates;
    /**
     * Return the list of candidates for a given query
     * Crude implementation for now, we return the candidates given by the first usable index if any
     * We try the following query types, in this order: basic match, $in match, comparison match
     * One way to make it better would be to enable the use of multiple indexes if the first usable index
     * returns too much data. I may do it in the future.
     *
     * Returned candidates will be scanned to find and remove all expired documents
     */
    getCandidates(query: any, dontExpireStaleDocs?: boolean): Promise<G[]>;
    /**
     * Insert a new document
     */
    private _insert;
    /**
     * Create a new _id that's not already in use
     */
    private createNewId;
    /**
     * Prepare a document (or array of documents) to be inserted in a database
     * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
     */
    private prepareDocumentForInsertion;
    /**
     * If newDoc is an array of documents, this will insert all documents in the cache
     */
    private _insertInCache;
    /**
     * If one insertion fails (e.g. because of a unique constraint), roll back all previous
     * inserts and throws the error
     */
    private _insertMultipleDocsInCache;
    insert(newDoc: G | G[]): Promise<types.Result<G>>;
    /**
     * Count all documents matching the query
     */
    count(query: any): Promise<number>;
    /**
     * Find all documents matching the query
     */
    find(query: any): Promise<G[]>;
    /**
     * Find all documents matching the query
     */
    cursor(query: any): Cursor<G>;
    /**
     * Update all docs matching query
     */
    private _update;
    update(query: any, updateQuery: any, options: UpdateOptions): Promise<types.Result<G> & {
        upsert: boolean;
    }>;
    /**
     * Remove all docs matching the query
     * For now very naive implementation (similar to update)
     */
    private _remove;
    remove(query: any, options?: {
        multi: boolean;
    }): Promise<types.Result<G>>;
}
// for some reason using @types will disable some type checks
interface DatabaseConfigurations<S extends BaseModel<S>> {
    ref: string;
    model?: (new () => S) & {
        new: (json: S) => S;
    };
    afterSerialization?(line: string): string;
    beforeDeserialization?(line: string): string;
    corruptAlertThreshold?: number;
    timestampData?: boolean;
    persistence_adapter?: typeof Persistence;
    autoCompaction?: number;
    reloadBeforeOperations?: boolean;
}
declare class Database<S extends BaseModel<S>> {
    private ref;
    private _datastore;
    private reloadBeforeOperations;
    model: (new () => S) & {
        new: (json: S) => S;
    };
    loaded: Promise<boolean>;
    constructor(options: DatabaseConfigurations<S>);
    private reloadFirst;
    /**
     * insert documents
     */
    insert(docs: S[]): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Find document(s) that meets a specified criteria
     */
    read({ filter, skip, limit, project, sort }: {
        filter?: Filter<NFP<S>>;
        skip?: number;
        limit?: number;
        sort?: SchemaKeySort<NFP<S>>;
        project?: SchemaKeyProjection<NFP<S>>;
    }): Promise<S[]>;
    /**
     * Update document(s) that meets the specified criteria
     */
    update({ filter, update, multi }: {
        filter: Filter<NFP<S>>;
        update: UpdateOperators<NFP<S>>;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Update document(s) that meets the specified criteria,
     * and do an insertion if no documents are matched
     */
    upsert({ filter, update, multi }: {
        filter: Filter<NFP<S>>;
        update: UpsertOperators<NFP<S>>;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
        upsert: boolean;
    }>;
    /**
     * Count documents that meets the specified criteria
     */
    count(filter?: Filter<NFP<S>>): Promise<number>;
    /**
     * Delete document(s) that meets the specified criteria
     *
     */
    delete({ filter, multi }: {
        filter: Filter<NFP<S>>;
        multi?: boolean;
    }): Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Create an index specified by options
     */
    createIndex(options: EnsureIndexOptions): Promise<{
        affectedIndex: string;
    }>;
    /**
     * Remove an index by passing the field name that it is related to
     */
    removeIndex(fieldName: string): Promise<{
        affectedIndex: string;
    }>;
    /**
     * Reload database from the persistence layer (if it exists)
     */
    reload(): Promise<{}>;
    /**
     * Compact the database persistence layer
     */
    compact(): Promise<{}>;
    /**
     * forcefully unlocks the persistence layer
     * use with caution, and only if you know what you're doing
     */
    forcefulUnlock(): Promise<{}>;
    /**
     * Stop auto compaction of the persistence layer
     */
    stopAutoCompaction(): Promise<{}>;
    /**
     * Set auto compaction defined by an an interval
     */
    resetAutoCompaction(interval: number): Promise<{}>;
    /**
     * Put one document
     */
    create: (docs: S[]) => Promise<{
        docs: S[];
        number: number;
    }>;
    /**
     * Find documents that meets a specified criteria
     */
    find: ({ filter, skip, limit, project, sort }: {
        filter?: Partial<{
            [key in {
                [K in keyof S]: S[K] extends Function ? never : K;
            }[keyof S]]: Pick<S, {
                [K in keyof S]: S[K] extends Function ? never : K;
            }[keyof S]>[key] | (Pick<S, {
                [K in keyof S]: S[K] extends Function ? never : K;
            }[keyof S]>[key] extends any[] ? ArrayFieldLevelQueryOperators<Pick<S, {
                [K in keyof S]: S[K] extends Function ? never : K;
            }[keyof S]>[key][0]> : AnyFieldLevelQueryOperators<Pick<S, {
                [K in keyof S]: S[K] extends Function ? never : K;
            }[keyof S]>[key]>);
        }> | TopLevelQueryOperators<Pick<S, {
            [K in keyof S]: S[K] extends Function ? never : K;
        }[keyof S]>> | undefined;
        skip?: number | undefined;
        limit?: number | undefined;
        sort?: Partial<{
            [key_1 in {
                [K in keyof S]: S[K] extends Function ? never : K;
            }[keyof S]]: 1 | -1;
        } & {
            $deep: {
                [key: string]: 1 | -1;
            };
        }> | undefined;
        project?: Partial<{
            [key_2 in {
                [K in keyof S]: S[K] extends Function ? never : K;
            }[keyof S]]: 0 | 1;
        } & {
            $deep: {
                [key: string]: 0 | 1;
            };
        }> | undefined;
    }) => Promise<S[]>;
    private _externalCall;
}
declare module PersistenceWrapper {
    export { Persistence };
}
import Base = PersistenceWrapper.Persistence;
declare class IDB_Persistence_Adapter extends Base {
    init(): Promise<void>;
    readIndexes(event: PersistenceEvent): Promise<void>;
    readData(event: PersistenceEvent): Promise<void>;
    rewriteIndexes(event: PersistenceEvent): Promise<void>;
    rewriteData(event: PersistenceEvent): Promise<void>;
    appendIndex(data: string): Promise<void>;
    appendData(data: string): Promise<void>;
}
declare class FS_Persistence_Adapter extends Persistence {
    indexesFilenameExtension: string;
    readFileByLine(event: PersistenceEvent, filename: string): Promise<unknown>;
    writeFileByLine(event: PersistenceEvent, filename: string): Promise<unknown>;
    init(): Promise<void>;
    readIndexes(event: PersistenceEvent): Promise<void>;
    readData(event: PersistenceEvent): Promise<void>;
    rewriteIndexes(event: PersistenceEvent): Promise<void>;
    rewriteData(event: PersistenceEvent): Promise<void>;
    appendIndex(data: string): Promise<void>;
    appendData(data: string): Promise<void>;
    forcefulUnlock(): Promise<void>;
}
export { Database, BaseModel, IDB_Persistence_Adapter, FS_Persistence_Adapter };

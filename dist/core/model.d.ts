interface keyedObject {
    [key: string]: Value;
}
declare type PrimitiveValue = number | string | boolean | undefined | null | Date;
declare type Value = keyedObject | Array<PrimitiveValue | keyedObject> | PrimitiveValue;
/**
 * Check a DB object and throw an error if it's not valid
 * Works by applying the above checkKey function to all fields recursively
 */
declare function checkObject(obj: Value): void;
/**
 * Serialize an object to be persisted to a one-line string
 * For serialization/deserialization, we use the native JSON parser and not eval or Function
 * That gives us less freedom but data entered in the database may come from users
 * so eval and the like are not safe
 * Accepted primitive types: Number, String, Boolean, Date, null
 * Accepted secondary types: Objects, Arrays
 */
declare function serialize(obj: Value): string;
/**
 * From a one-line representation of an object generate by the serialize function
 * Return the object itself
 */
declare function deserialize(rawData: string): any;
/**
 * Deep copy a DB object
 * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
 * where the keys are valid, i.e. don't begin with $ and don't contain a .
 */
declare function deepCopy<T>(obj: T, strictKeys?: boolean): T;
/**
 * Tells if an object is a primitive type or a "real" object
 * Arrays are considered primitive
 */
declare function isPrimitiveType(obj: Value): boolean;
/**
 * Utility functions for comparing things
 * Assumes type checking was already done (a and b already have the same type)
 * compareNSB works for numbers, strings and booleans
 */
declare type NSB = number | string | boolean;
declare function compareNSB<T extends NSB>(a: T, b: T): 0 | 1 | -1;
/**
 * Compare { things U undefined }
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * We need to compare with undefined as it will be used in indexes
 * In the case of objects and arrays, we deep-compare
 * If two objects don't have the same type, the (arbitrary) type hierarchy is: undefined, null, number, strings, boolean, dates, arrays, objects
 * Return -1 if a < b, 1 if a > b and 0 if a = b (note that equality here is NOT the same as defined in areThingsEqual!)
 *
 */
declare function compareThings<V>(a: V, b: V, _compareStrings?: typeof compareNSB): 0 | 1 | -1;
/**
 * Modify a DB object according to an update query
 */
declare function modify<G extends {
    _id?: string;
}>(obj: G, updateQuery: any): G;
/**
 * Get a value from object with dot notation
 */
declare function getDotValue(obj: any, field: string): any;
/**
 * Check whether 'things' are equal
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * In the case of object, we check deep equality
 * Returns true if they are, false otherwise
 */
declare function areThingsEqual<A, B>(a: A, b: B): boolean;
/**
 * Tell if a given document matches a query
 */
declare function match(obj: any, query: any): boolean;
export { serialize, deserialize, deepCopy, checkObject, isPrimitiveType, modify, getDotValue, match, areThingsEqual, compareThings, };

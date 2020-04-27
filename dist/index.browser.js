(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.ffdb = {}));
}(this, (function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    const lut = [];
    for (let i = 0; i < 256; i++) {
        lut[i] = (i < 16 ? "0" : "") + i.toString(16);
    }
    function uid() {
        let d0 = (Math.random() * 0xffffffff) | 0;
        let d1 = (Math.random() * 0xffffffff) | 0;
        let d2 = (Math.random() * 0xffffffff) | 0;
        let d3 = (Math.random() * 0xffffffff) | 0;
        return (lut[d0 & 0xff] +
            lut[(d0 >> 8) & 0xff] +
            lut[(d0 >> 16) & 0xff] +
            lut[(d0 >> 24) & 0xff] +
            "-" +
            lut[d1 & 0xff] +
            lut[(d1 >> 8) & 0xff] +
            "-" +
            lut[((d1 >> 16) & 0x0f) | 0x40] +
            lut[(d1 >> 24) & 0xff] +
            "-" +
            lut[(d2 & 0x3f) | 0x80] +
            lut[(d2 >> 8) & 0xff] +
            "-" +
            lut[(d2 >> 16) & 0xff] +
            lut[(d2 >> 24) & 0xff] +
            lut[d3 & 0xff] +
            lut[(d3 >> 8) & 0xff] +
            lut[(d3 >> 16) & 0xff] +
            lut[(d3 >> 24) & 0xff]);
    }
    function randomString(len) {
        return Array.from(new Uint8Array(120))
            .map((x) => Math.random().toString(36))
            .join("")
            .split("0.")
            .join("")
            .substr(0, len);
    }

    /**
     * Check a key throw an error if the key is non valid
     * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
     * Its serialized-then-deserialized version it will transformed into a Date object
     * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
     */
    function checkKey(k, v) {
        if (typeof k === "number") {
            k = k.toString();
        }
        if (k[0] === "$" &&
            !(k === "$$date" && typeof v === "number") &&
            !(k === "$$deleted" && v === true) &&
            !(k === "$$indexCreated") &&
            !(k === "$$indexRemoved")) {
            throw new Error("Field names cannot begin with the $ character");
        }
        if (k.indexOf(".") !== -1) {
            throw new Error("Field names cannot contain a .");
        }
    }
    /**
     * Check a DB object and throw an error if it's not valid
     * Works by applying the above checkKey function to all fields recursively
     */
    function checkObject(obj) {
        if (Array.isArray(obj)) {
            obj.forEach((o) => checkObject(o));
        }
        else if (typeof obj === "object" &&
            obj !== null &&
            !(obj instanceof Date)) {
            Object.keys(obj).forEach(function (k) {
                checkKey(k, obj[k]);
                checkObject(obj[k]);
            });
        }
    }
    /**
     * Serialize an object to be persisted to a one-line string
     * For serialization/deserialization, we use the native JSON parser and not eval or Function
     * That gives us less freedom but data entered in the database may come from users
     * so eval and the like are not safe
     * Accepted primitive types: Number, String, Boolean, Date, null
     * Accepted secondary types: Objects, Arrays
     */
    function serialize(obj) {
        var res;
        res = JSON.stringify(obj, function (k, v) {
            checkKey(k, v);
            if (v === undefined) {
                return undefined;
            }
            if (v === null) {
                return null;
            }
            // Hackish way of checking if object is Date.
            // We can't use value directly because for dates it is already string in this function (date.toJSON was already called), so we use this
            if (typeof this[k].getTime === "function") {
                return { $$date: this[k].getTime() };
            }
            return v;
        });
        return res;
    }
    /**
     * From a one-line representation of an object generate by the serialize function
     * Return the object itself
     */
    function deserialize(rawData) {
        return JSON.parse(rawData, function (k, v) {
            if (k === "$$date") {
                return new Date(v);
            }
            if (typeof v === "string" ||
                typeof v === "number" ||
                typeof v === "boolean" ||
                v === null) {
                return v;
            }
            if (v && v.$$date) {
                return v.$$date;
            }
            return v;
        });
    }
    /**
     * Deep copy a DB object
     * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
     * where the keys are valid, i.e. don't begin with $ and don't contain a .
     */
    function deepCopy(obj, model, strictKeys) {
        let res = undefined;
        if (typeof obj === "boolean" ||
            typeof obj === "number" ||
            typeof obj === "string" ||
            obj === null ||
            obj instanceof Date) {
            return obj;
        }
        if (Array.isArray(obj)) {
            res = [];
            obj.forEach((o) => res.push(deepCopy(o, model, strictKeys)));
            return res;
        }
        if (typeof obj === "object") {
            res = {};
            Object.keys(obj).forEach((k) => {
                if (!strictKeys || (k[0] !== "$" && k.indexOf(".") === -1)) {
                    res[k] = deepCopy(obj[k], model, strictKeys);
                }
            });
            if (res.hasOwnProperty("_id")) {
                return model.new(res);
            }
            else {
                return res;
            }
        }
        return JSON.parse(JSON.stringify({ temp: obj })).temp;
    }
    /**
     * Tells if an object is a primitive type or a "real" object
     * Arrays are considered primitive
     */
    function isPrimitiveType(obj) {
        return (typeof obj === "boolean" ||
            typeof obj === "number" ||
            typeof obj === "string" ||
            obj === null ||
            obj instanceof Date ||
            Array.isArray(obj));
    }
    function compareNSB(a, b) {
        if (a < b) {
            return -1;
        }
        if (a > b) {
            return 1;
        }
        return 0;
    }
    function compareArrays(a, b) {
        for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
            let comp = compareThings(a[i], b[i]);
            if (comp !== 0) {
                return comp;
            }
        }
        // Common section was identical, longest one wins
        return compareNSB(a.length, b.length);
    }
    /**
     * Compare { things U undefined }
     * Things are defined as any native types (string, number, boolean, null, date) and objects
     * We need to compare with undefined as it will be used in indexes
     * In the case of objects and arrays, we deep-compare
     * If two objects don't have the same type, the (arbitrary) type hierarchy is: undefined, null, number, strings, boolean, dates, arrays, objects
     * Return -1 if a < b, 1 if a > b and 0 if a = b (note that equality here is NOT the same as defined in areThingsEqual!)
     *
     */
    function compareThings(a, b, _compareStrings) {
        const compareStrings = _compareStrings || compareNSB;
        // undefined
        if (a === undefined) {
            return b === undefined ? 0 : -1;
        }
        if (b === undefined) {
            return a === undefined ? 0 : 1;
        }
        // null
        if (a === null) {
            return b === null ? 0 : -1;
        }
        if (b === null) {
            return a === null ? 0 : 1;
        }
        // Numbers
        if (typeof a === "number") {
            return typeof b === "number" ? compareNSB(a, b) : -1;
        }
        if (typeof b === "number") {
            return typeof a === "number" ? compareNSB(a, b) : 1;
        }
        // Strings
        if (typeof a === "string") {
            return typeof b === "string" ? compareStrings(a, b) : -1;
        }
        if (typeof b === "string") {
            return typeof a === "string" ? compareStrings(a, b) : 1;
        }
        // Booleans
        if (typeof a === "boolean") {
            return typeof b === "boolean" ? compareNSB(a, b) : -1;
        }
        if (typeof b === "boolean") {
            return typeof a === "boolean" ? compareNSB(a, b) : 1;
        }
        // Dates
        if (a instanceof Date) {
            return b instanceof Date ? compareNSB(a.getTime(), b.getTime()) : -1;
        }
        if (b instanceof Date) {
            return a instanceof Date ? compareNSB(a.getTime(), b.getTime()) : 1;
        }
        // Arrays (first element is most significant and so on)
        if (Array.isArray(a)) {
            return Array.isArray(b) ? compareArrays(a, b) : -1;
        }
        if (Array.isArray(b)) {
            return Array.isArray(a) ? compareArrays(a, b) : 1;
        }
        // Objects
        let aKeys = Object.keys(a).sort();
        let bKeys = Object.keys(b).sort();
        for (let i = 0; i < Math.min(aKeys.length, bKeys.length); i += 1) {
            let comp = compareThings(a[aKeys[i]], b[bKeys[i]]);
            if (comp !== 0) {
                return comp;
            }
        }
        return compareNSB(aKeys.length, bKeys.length);
    }
    // ==============================================================
    // Updating documents
    // ==============================================================
    /**
     * The signature of modifier functions is as follows
     * Their structure is always the same: recursively follow the dot notation while creating
     * the nested documents if needed, then apply the "last step modifier"
     */
    const lastStepModifierFunctions = {
        $set: function (obj, field, value) {
            if (!obj) {
                return;
            }
            obj[field] = value;
        },
        $mul: function (obj, field, value) {
            let base = obj[field];
            if (typeof value !== "number" || typeof base !== "number") {
                throw new Error("Multiply operator works only on numbers");
            }
            obj[field] = base * value;
        },
        $unset: function (obj, field) {
            delete obj[field];
        },
        /**
         * Push an element to the end of an array field
         * Optional modifier $each instead of value to push several values
         * Optional modifier $slice to slice the resulting array, see https://docs.mongodb.org/manual/reference/operator/update/slice/
         * Differences with MongoDB: if $slice is specified and not $each, we act as if value is an empty array
         */
        $push: function (obj, field, value) {
            // Create the array if it doesn't exist
            if (!obj.hasOwnProperty(field)) {
                obj[field] = [];
            }
            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $push an element on non-array values");
            }
            if (value !== null &&
                typeof value === "object" &&
                value["$slice"] &&
                value["$each"] === undefined) {
                value.$each = [];
            }
            if (value !== null &&
                typeof value === "object" &&
                value["$each"]) {
                const eachVal = value["$each"];
                const sliceVal = value["$slice"];
                const posVal = value["$position"];
                const sortVal = value["$sort"];
                const allKeys = Object.keys(value);
                if (Object.keys(value).length > 1) {
                    if (allKeys.filter((x) => {
                        return (["$each", "$slice", "$position", "$sort"].indexOf(x) === -1);
                    }).length) {
                        throw new Error("Can only use the modifiers $slice, $position and $sort in conjunction with $each when $push to array");
                    }
                }
                if (!Array.isArray(eachVal)) {
                    throw new Error("$each requires an array value");
                }
                if (posVal) {
                    for (let i = 0; i < eachVal.length; i++) {
                        const element = eachVal[i];
                        obj[field].splice(posVal + i, 0, element);
                    }
                }
                else {
                    eachVal.forEach((v) => obj[field].push(v));
                }
                if (sortVal) {
                    if (typeof sortVal === "number") {
                        if (sortVal === 1)
                            obj[field].sort((a, b) => compareThings(a, b));
                        else
                            obj[field].sort((a, b) => compareThings(b, a));
                    }
                    else {
                        obj[field].sort((a, b) => {
                            const keys = Object.keys(sortVal);
                            for (let i = 0; i < keys.length; i++) {
                                const key = keys[i];
                                const order = sortVal[key];
                                if (order === 1) {
                                    const comp = compareThings(a[key], b[key]);
                                    if (comp)
                                        return comp;
                                }
                                else {
                                    const comp = compareThings(b[key], a[key]);
                                    if (comp)
                                        return comp;
                                }
                            }
                            return 0;
                        });
                    }
                }
                if (sliceVal === undefined) {
                    return;
                }
                if (sliceVal !== undefined && typeof sliceVal !== "number") {
                    throw new Error("$slice requires a number value");
                }
                if (sliceVal === 0) {
                    obj[field] = [];
                }
                else {
                    let start = 0;
                    let end = 0;
                    let n = obj[field].length;
                    if (sliceVal < 0) {
                        start = Math.max(0, n + sliceVal);
                        end = n;
                    }
                    else if (sliceVal > 0) {
                        start = 0;
                        end = Math.min(n, sliceVal);
                    }
                    obj[field] = obj[field].slice(start, end);
                }
            }
            else {
                obj[field].push(value);
            }
        },
        /**
         * Add an element to an array field only if it is not already in it
         * No modification if the element is already in the array
         * Note that it doesn't check whether the original array contains duplicates
         */
        $addToSet: function (obj, field, value) {
            // Create the array if it doesn't exist
            if (!obj.hasOwnProperty(field)) {
                obj[field] = [];
            }
            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $addToSet an element on non-array values");
            }
            const eachVal = value["$each"];
            if (value !== null && typeof value === "object" && eachVal) {
                if (Object.keys(value).length > 1) {
                    throw new Error("Can't use another field in conjunction with $each on $addToSet modifier");
                }
                if (!Array.isArray(eachVal)) {
                    throw new Error("$each requires an array value");
                }
                eachVal.forEach((v) => lastStepModifierFunctions.$addToSet(obj, field, v));
            }
            else {
                let addToSet = true;
                for (let index = 0; index < obj[field].length; index++) {
                    const element = obj[field][index];
                    if (compareThings(element, value) === 0) {
                        addToSet = false;
                        break;
                    }
                }
                if (addToSet) {
                    obj[field].push(value);
                }
            }
        },
        /**
         * Remove the first or last element of an array
         */
        $pop: function (obj, field, value) {
            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $pop an element from non-array values");
            }
            if (typeof value !== "number") {
                throw new Error(value + " isn't an integer, can't use it with $pop");
            }
            if (value === 0) {
                return;
            }
            if (value > 0) {
                obj[field] = obj[field].slice(0, obj[field].length - 1);
            }
            else {
                obj[field] = obj[field].slice(1);
            }
        },
        /**
         * Removes all instances of a value from an existing array
         */
        $pull: function (obj, field, value) {
            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $pull an element from non-array values");
            }
            let arr = obj[field];
            for (let i = arr.length - 1; i >= 0; i -= 1) {
                if (match(arr[i], value)) {
                    arr.splice(i, 1);
                }
            }
        },
        /**
         * Removes all instances of a value from an existing array
         */
        $pullAll: function (obj, field, value) {
            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $pull an element from non-array values");
            }
            let arr = obj[field];
            for (let i = arr.length - 1; i >= 0; i -= 1) {
                for (let j = 0; j < value.length; j++) {
                    if (match(arr[i], value[j])) {
                        arr.splice(i, 1);
                    }
                }
            }
        },
        /**
         * Increment a numeric field's value
         */
        $inc: function (obj, field, value) {
            if (typeof value !== "number") {
                throw new Error(value + " must be a number");
            }
            if (typeof obj[field] !== "number") {
                if (!obj.hasOwnProperty(field)) {
                    obj[field] = value;
                }
                else {
                    throw new Error("Can't use the $inc modifier on non-number fields");
                }
            }
            else {
                obj[field] = obj[field] + value;
            }
        },
        /**
         * Updates the value of the field, only if specified field is greater than the current value of the field
         */
        $max: function (obj, field, value) {
            if (typeof obj[field] === "undefined") {
                obj[field] = value;
            }
            else if (value > obj[field]) {
                obj[field] = value;
            }
        },
        /**
         * Updates the value of the field, only if specified field is smaller than the current value of the field
         */
        $min: function (obj, field, value) {
            if (typeof obj[field] === "undefined") {
                obj[field] = value;
            }
            else if (value < obj[field]) {
                obj[field] = value;
            }
        },
        $currentDate: function (obj, field, value) {
            if (value === true) {
                obj[field] = new Date();
            }
            else if (value.$type && value.$type === "timestamp") {
                obj[field] = Date.now();
            }
            else if (value.$type && value.$type === "date") {
                obj[field] = new Date();
            }
        },
        $rename: function (obj, field, value) {
            obj[value] = obj[field];
            delete obj[field];
        },
        $setOnInsert: function () {
            // if the operator reached here
            // it means that the update was not actually an insertion.
            // this operator is being dealt with at the datastore.ts file
        },
    };
    // Given its name, create the complete modifier function
    function createModifierFunction(modifier) {
        return function (obj, field, value) {
            var fieldParts = typeof field === "string" ? field.split(".") : field;
            if (fieldParts.length === 1) {
                lastStepModifierFunctions[modifier](obj, field, value);
            }
            else {
                if (obj[fieldParts[0]] === undefined) {
                    if (modifier === "$unset") {
                        return;
                    } // Bad looking specific fix, needs to be generalized modifiers that behave like $unset are implemented
                    obj[fieldParts[0]] = {};
                }
                modifierFunctions[modifier](obj[fieldParts[0]], fieldParts.slice(1).join("."), value);
            }
        };
    }
    const modifierFunctions = {};
    // Actually create all modifier functions
    Object.keys(lastStepModifierFunctions).forEach(function (modifier) {
        modifierFunctions[modifier] = createModifierFunction(modifier);
    });
    /**
     * Modify a DB object according to an update query
     */
    function modify(obj, updateQuery, model) {
        var keys = Object.keys(updateQuery);
        let firstChars = keys.map((x) => x.charAt(0));
        let dollarFirstChars = firstChars.filter((x) => x === "$");
        if (keys.indexOf("_id") !== -1 &&
            updateQuery["_id"] !== obj._id) {
            throw new Error("You cannot change a document's _id");
        }
        if (dollarFirstChars.length !== 0 &&
            dollarFirstChars.length !== firstChars.length) {
            throw new Error("You cannot mix modifiers and normal fields");
        }
        let newDoc;
        if (dollarFirstChars.length === 0) {
            // Simply replace the object with the update query contents
            newDoc = deepCopy(updateQuery, model);
            newDoc._id = obj._id;
        }
        else {
            // Apply modifiers
            let modifiers = Array.from(new Set(keys));
            newDoc = deepCopy(obj, model);
            modifiers.forEach(function (modifier) {
                let modArgument = updateQuery[modifier];
                if (!modifierFunctions[modifier]) {
                    throw new Error("Unknown modifier " + modifier);
                }
                // Can't rely on Object.keys throwing on non objects since ES6
                // Not 100% satisfying as non objects can be interpreted as objects but no false negatives so we can live with it
                if (typeof modArgument !== "object") {
                    throw new Error("Modifier " + modifier + "'s argument must be an object");
                }
                let keys = Object.keys(modArgument);
                keys.forEach(function (k) {
                    modifierFunctions[modifier](newDoc, k, modArgument[k]);
                });
            });
        }
        // Check result is valid and return it
        checkObject(newDoc);
        if (obj._id !== newDoc._id) {
            throw new Error("You can't change a document's _id");
        }
        return newDoc;
    }
    // ==============================================================
    // Finding documents
    // ==============================================================
    /**
     * Get a value from object with dot notation
     */
    function getDotValue(obj, field) {
        const fieldParts = typeof field === "string" ? field.split(".") : field;
        if (!obj) {
            return undefined;
        } // field cannot be empty so that means we should return undefined so that nothing can match
        if (fieldParts.length === 0) {
            return obj;
        }
        if (fieldParts.length === 1) {
            return obj[fieldParts[0]];
        }
        if (Array.isArray(obj[fieldParts[0]])) {
            // If the next field is an integer, return only this item of the array
            let i = parseInt(fieldParts[1], 10);
            if (typeof i === "number" && !isNaN(i)) {
                return getDotValue(obj[fieldParts[0]][i], fieldParts.slice(2));
            }
            // Return the array of values
            let objects = new Array();
            for (let i = 0; i < obj[fieldParts[0]].length; i += 1) {
                objects.push(getDotValue(obj[fieldParts[0]][i], fieldParts.slice(1)));
            }
            return objects;
        }
        else {
            return getDotValue(obj[fieldParts[0]], fieldParts.slice(1));
        }
    }
    /**
     * Check whether 'things' are equal
     * Things are defined as any native types (string, number, boolean, null, date) and objects
     * In the case of object, we check deep equality
     * Returns true if they are, false otherwise
     */
    function areThingsEqual(a, b) {
        var aKeys, bKeys, i;
        // Strings, booleans, numbers, null
        if (a === null ||
            typeof a === "string" ||
            typeof a === "boolean" ||
            typeof a === "number" ||
            b === null ||
            typeof b === "string" ||
            typeof b === "boolean" ||
            typeof b === "number") {
            return a === b;
        }
        // Dates
        if (a instanceof Date || b instanceof Date) {
            return (a instanceof Date &&
                b instanceof Date &&
                a.getTime() === b.getTime());
        }
        // Arrays (no match since arrays are used as a $in)
        // undefined (no match since they mean field doesn't exist and can't be serialized)
        if ((!(Array.isArray(a) && Array.isArray(b)) &&
            (Array.isArray(a) || Array.isArray(b))) ||
            a === undefined ||
            b === undefined) {
            return false;
        }
        // General objects (check for deep equality)
        // a and b should be objects at this point
        try {
            aKeys = Object.keys(a);
            bKeys = Object.keys(b);
        }
        catch (e) {
            return false;
        }
        if (aKeys.length !== bKeys.length) {
            return false;
        }
        for (i = 0; i < aKeys.length; i += 1) {
            if (bKeys.indexOf(aKeys[i]) === -1) {
                return false;
            }
            if (!areThingsEqual(a[aKeys[i]], b[aKeys[i]])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check that two values are comparable
     */
    function areComparable(a, b) {
        if (typeof a !== "string" &&
            typeof a !== "number" &&
            !(a instanceof Date) &&
            typeof b !== "string" &&
            typeof b !== "number" &&
            !(b instanceof Date)) {
            return false;
        }
        if (typeof a !== typeof b) {
            return false;
        }
        return true;
    }
    const comparisonFunctions = {};
    /**
     * Arithmetic and comparison operators
     */
    comparisonFunctions.$type = function (a, b) {
        if (["number", "boolean", "string", "undefined"].indexOf(b) > -1) {
            return typeof a === b;
        }
        else if (b === "array") {
            return Array.isArray(a);
        }
        else if (b === "null") {
            return a === null;
        }
        else if (b === "date") {
            return a instanceof Date;
        }
        else if (b === "object") {
            return (typeof a === "object" &&
                !(a instanceof Date) &&
                !(a === null) &&
                !Array.isArray(a));
        }
        else
            return false;
    };
    comparisonFunctions.$not = function (a, b) {
        return !match({ k: a }, { k: b });
    };
    comparisonFunctions.$eq = function (a, b) {
        return areThingsEqual(a, b);
    };
    comparisonFunctions.$lt = function (a, b) {
        return areComparable(a, b) && a < b;
    };
    comparisonFunctions.$lte = function (a, b) {
        return areComparable(a, b) && a <= b;
    };
    comparisonFunctions.$gt = function (a, b) {
        return areComparable(a, b) && a > b;
    };
    comparisonFunctions.$gte = function (a, b) {
        return areComparable(a, b) && a >= b;
    };
    comparisonFunctions.$mod = function (a, b) {
        if (!Array.isArray(b)) {
            throw new Error("malformed mod, must be supplied with an array");
        }
        if (b.length !== 2) {
            throw new Error("malformed mod, array length must be exactly two, a divisor and a remainder");
        }
        return a % b[0] === b[1];
    };
    comparisonFunctions.$ne = function (a, b) {
        if (a === undefined) {
            return true;
        }
        return !areThingsEqual(a, b);
    };
    comparisonFunctions.$in = function (a, b) {
        var i;
        if (!Array.isArray(b)) {
            throw new Error("$in operator called with a non-array");
        }
        for (i = 0; i < b.length; i += 1) {
            if (areThingsEqual(a, b[i])) {
                return true;
            }
        }
        return false;
    };
    comparisonFunctions.$nin = function (a, b) {
        if (!Array.isArray(b)) {
            throw new Error("$nin operator called with a non-array");
        }
        return !comparisonFunctions.$in(a, b);
    };
    comparisonFunctions.$regex = function (a, b) {
        if (!(b instanceof RegExp)) {
            throw new Error("$regex operator called with non regular expression");
        }
        if (typeof a !== "string") {
            return false;
        }
        else {
            return b.test(a);
        }
    };
    comparisonFunctions.$exists = function (value, exists) {
        if (exists || exists === "") {
            // This will be true for all values of exists except false, null, undefined and 0
            exists = true; // That's strange behaviour (we should only use true/false) but that's the way Mongo does it...
        }
        else {
            exists = false;
        }
        if (value === undefined) {
            return !exists;
        }
        else {
            return exists;
        }
    };
    // Specific to arrays
    comparisonFunctions.$size = function (obj, value) {
        if (!Array.isArray(obj)) {
            return false;
        }
        if (value % 1 !== 0) {
            throw new Error("$size operator called without an integer");
        }
        return (obj.length === value);
    };
    comparisonFunctions.$elemMatch = function (obj, value) {
        if (!Array.isArray(obj)) {
            return false;
        }
        var i = obj.length;
        var result = false; // Initialize result
        while (i--) {
            if (match(obj[i], value)) {
                // If match for array element, return true
                result = true;
                break;
            }
        }
        return result;
    };
    comparisonFunctions.$all = function (a, b) {
        if (!Array.isArray(a)) {
            throw new Error("$all must be applied on fields of type array");
        }
        if (!Array.isArray(b)) {
            throw new Error("$all must be supplied with argument of type array");
        }
        for (let i = 0; i < b.length; i++) {
            const elementInArgument = b[i];
            if (a.indexOf(elementInArgument) === -1) {
                return false;
            }
        }
        return true;
    };
    const arrayComparisonFunctions = {};
    arrayComparisonFunctions.$size = true;
    arrayComparisonFunctions.$elemMatch = true;
    arrayComparisonFunctions.$all = true;
    const logicalOperators = {};
    /**
     * Match any of the subqueries
     */
    logicalOperators.$or = function (obj, query) {
        var i;
        if (!Array.isArray(query)) {
            throw new Error("$or operator used without an array");
        }
        for (i = 0; i < query.length; i += 1) {
            if (match(obj, query[i])) {
                return true;
            }
        }
        return false;
    };
    /**
     * Match all of the subqueries
     */
    logicalOperators.$and = function (obj, query) {
        if (!Array.isArray(query)) {
            throw new Error("$and operator used without an array");
        }
        for (let i = 0; i < query.length; i += 1) {
            if (!match(obj, query[i])) {
                return false;
            }
        }
        return true;
    };
    /**
     * Match non of the subqueries
     */
    logicalOperators.$nor = function (obj, query) {
        if (!Array.isArray(query)) {
            throw new Error("$nor operator used without an array");
        }
        for (let i = 0; i < query.length; i += 1) {
            if (match(obj, query[i])) {
                return false;
            }
        }
        return true;
    };
    /**
     * Use a function to match
     */
    logicalOperators.$where = function (obj, fn) {
        var result;
        if (typeof fn !== "function") {
            throw new Error("$where operator used without a function");
        }
        result = fn.call(obj);
        if (typeof result !== "boolean") {
            throw new Error("$where function must return boolean");
        }
        return result;
    };
    /**
     * Tell if a given document matches a query
     */
    function match(obj, query) {
        // Primitive query against a primitive type
        // This is a bit of a hack since we construct an object with an arbitrary key only to dereference it later
        // But I don't have time for a cleaner implementation now
        if (isPrimitiveType(obj) || isPrimitiveType(query)) {
            return matchQueryPart({ needAKey: obj }, "needAKey", query);
        }
        // Normal query
        let queryKeys = Object.keys(query);
        for (let i = 0; i < queryKeys.length; i += 1) {
            let queryKey = queryKeys[i];
            let queryValue = query[queryKey];
            if (queryKey[0] === "$") {
                if (!logicalOperators[queryKey]) {
                    throw new Error("Unknown logical operator " + queryKey);
                }
                if (!logicalOperators[queryKey](obj, queryValue)) {
                    return false;
                }
            }
            else {
                if (!matchQueryPart(obj, queryKey, queryValue)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Match an object against a specific { key: value } part of a query
     * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
     */
    function matchQueryPart(obj, queryKey, queryValue, treatObjAsValue) {
        const objValue = getDotValue(obj, queryKey);
        // Check if the value is an array if we don't force a treatment as value
        if (Array.isArray(objValue) && !treatObjAsValue) {
            // If the queryValue is an array, try to perform an exact match
            if (Array.isArray(queryValue)) {
                return matchQueryPart(obj, queryKey, queryValue, true);
            }
            // Check if we are using an array-specific comparison function
            if (queryValue !== null &&
                typeof queryValue === "object" &&
                !(queryValue instanceof RegExp)) {
                let keys = Object.keys(queryValue);
                for (let i = 0; i < keys.length; i += 1) {
                    if (arrayComparisonFunctions[keys[i]]) {
                        return matchQueryPart(obj, queryKey, queryValue, true);
                    }
                }
            }
            // If not, treat it as an array of { obj, query } where there needs to be at least one match
            for (let i = 0; i < objValue.length; i += 1) {
                // edge case: using $ne on array
                if (queryValue["$ne"]) {
                    if (objValue.indexOf(queryValue["$ne"]) !== -1) {
                        return false;
                    }
                }
                if (Array.isArray(queryValue["$nin"])) {
                    const intersection = queryValue["$nin"].filter((value) => -1 !== objValue.indexOf(value));
                    if (intersection.length) {
                        return false;
                    }
                }
                if (matchQueryPart({ k: objValue[i] }, "k", queryValue)) {
                    return true;
                } // k here could be any string
            }
            return false;
        }
        // queryValue is an actual object. Determine whether it contains comparison operators
        // or only normal fields. Mixed objects are not allowed
        if (queryValue !== null &&
            typeof queryValue === "object" &&
            !(queryValue instanceof RegExp) &&
            !Array.isArray(queryValue)) {
            let keys = Object.keys(queryValue);
            let firstChars = keys.map((item) => item[0]);
            let dollarFirstChars = firstChars.filter((c) => c === "$");
            if (dollarFirstChars.length !== 0 &&
                dollarFirstChars.length !== firstChars.length) {
                throw new Error("You cannot mix operators and normal fields");
            }
            // queryValue is an object of this form: { $comparisonOperator1: value1, ... }
            if (dollarFirstChars.length > 0) {
                for (let i = 0; i < keys.length; i += 1) {
                    if (!comparisonFunctions[keys[i]]) {
                        throw new Error("Unknown comparison function " + keys[i]);
                    }
                    if (!comparisonFunctions[keys[i]](objValue, queryValue[keys[i]])) {
                        return false;
                    }
                }
                return true;
            }
        }
        // Using regular expressions with basic querying
        if (queryValue instanceof RegExp) {
            return comparisonFunctions.$regex(objValue, queryValue);
        }
        // queryValue is either a native value or a normal object
        // Basic matching is possible
        if (!areThingsEqual(objValue, queryValue)) {
            return false;
        }
        return true;
    }

    /**
     * Create a new cursor for this collection
     */
    class Cursor {
        constructor(db, query) {
            this.db = db;
            this.query = query || {};
        }
        /**
         * Set a limit to the number of results
         */
        limit(limit) {
            this._limit = limit;
            return this;
        }
        /**
         * Skip a the number of results
         */
        skip(skip) {
            this._skip = skip;
            return this;
        }
        /**
         * Sort results of the query
         */
        sort(sortQuery) {
            this._sort = sortQuery;
            return this;
        }
        /**
         * Add the use of a projection
         */
        projection(projection) {
            this._projection = projection;
            return this;
        }
        /**
         * Apply the projection
         */
        _project(candidates) {
            if (this._projection === undefined ||
                Object.keys(this._projection).length === 0) {
                return candidates;
            }
            let res = [];
            let keepId = this._projection._id !== 0;
            delete this._projection._id;
            let keys = Object.keys(this._projection);
            // Check for consistency
            // either all are 0, or all are -1
            let actions = keys.map((k) => this._projection[k]).sort();
            if (actions[0] !== actions[actions.length - 1]) {
                throw new Error("Can't both keep and omit fields except for _id");
            }
            let action = actions[0];
            // Do the actual projection
            candidates.forEach((candidate) => {
                let toPush = {};
                if (action === 1) {
                    // pick-type projection
                    toPush = { $set: {} };
                    keys.forEach((k) => {
                        toPush.$set[k] = getDotValue(candidate, k);
                        if (toPush.$set[k] === undefined) {
                            delete toPush.$set[k];
                        }
                    });
                    toPush = modify({}, toPush, this.db.model);
                }
                else {
                    // omit-type projection
                    toPush = { $unset: {} };
                    keys.forEach((k) => {
                        toPush.$unset[k] = true;
                    });
                    toPush = modify(candidate, toPush, this.db.model);
                }
                if (keepId) {
                    toPush._id = candidate._id;
                }
                else {
                    delete toPush._id;
                }
                res.push(toPush);
            });
            return res;
        }
        /**
         * Get all matching elements
         * Will return pointers to matched elements (shallow copies), returning full copies is the role of find or findOne
         *
         */
        __exec_unsafe() {
            return __awaiter(this, void 0, void 0, function* () {
                let res = [];
                let added = 0;
                let skipped = 0;
                const candidates = yield this.db.getCandidates(this.query);
                for (let i = 0; i < candidates.length; i++) {
                    if (match(candidates[i], this.query)) {
                        // If a sort is defined, wait for the results to be sorted before applying limit and skip
                        if (!this._sort) {
                            if (this._skip && this._skip > skipped) {
                                skipped++;
                            }
                            else {
                                res.push(candidates[i]);
                                added++;
                                if (this._limit && this._limit <= added) {
                                    break;
                                }
                            }
                        }
                        else {
                            res.push(candidates[i]);
                        }
                    }
                }
                // Apply all sorts
                if (this._sort) {
                    let keys = Object.keys(this._sort);
                    // Sorting
                    const criteria = [];
                    for (let i = 0; i < keys.length; i++) {
                        let key = keys[i];
                        criteria.push({ key, direction: this._sort[key] });
                    }
                    res.sort((a, b) => {
                        let criterion;
                        let compare;
                        let i;
                        for (i = 0; i < criteria.length; i++) {
                            criterion = criteria[i];
                            compare =
                                criterion.direction *
                                    compareThings(getDotValue(a, criterion.key), getDotValue(b, criterion.key));
                            if (compare !== 0) {
                                return compare;
                            }
                        }
                        return 0;
                    });
                    // Applying limit and skip
                    const limit = this._limit || res.length;
                    const skip = this._skip || 0;
                    res = res.slice(skip, skip + limit);
                }
                // Apply projection
                res = this._project(res);
                return res;
            });
        }
        _exec() {
            return __awaiter(this, void 0, void 0, function* () {
                return this.db.q.add(() => this.__exec_unsafe());
            });
        }
        exec() {
            return __awaiter(this, void 0, void 0, function* () {
                const originalsArr = yield this._exec();
                const res = [];
                for (let index = 0; index < originalsArr.length; index++) {
                    res.push(deepCopy(originalsArr[index], this.db.model));
                }
                return res;
            });
        }
    }

    /*
     * Default compareKeys function will work for numbers, strings and dates
     */
    function defaultCompareKeysFunction(a, b) {
        const diff = a - b;
        if (!isNaN(diff)) {
            return diff;
        }
        const err = new Error(`Couldn't compare elements "${a}" "${b}"`);
        throw err;
    }
    /**
     * Check whether two values are equal (used in non-unique deletion)
     */
    function defaultCheckValueEquality(a, b) {
        return a === b;
    }
    function isDef(v) {
        return v !== undefined;
    }

    /**
     * Simple binary search tree
     */
    class BST {
        constructor(init = {}) {
            this.left = init.left;
            this.right = init.right;
            this.parent = init.parent;
            if (init.hasOwnProperty("key")) {
                this.key = init.key;
            }
            this.data = init.value !== undefined ? [init.value] : [];
            this.unique = init.unique || false;
            this.compareKeys = init.compareKeys || defaultCompareKeysFunction;
            this.checkValueEquality =
                init.checkValueEquality || defaultCheckValueEquality;
        }
        /**
         * Get the descendant with max key
         */
        getMaxKeyDescendant() {
            if (this.right) {
                return this.right.getMaxKeyDescendant();
            }
            else {
                return this;
            }
        }
        /**
         * Get the maximum key
         */
        getMaxKey() {
            return this.getMaxKeyDescendant().key;
        }
        /**
         * Get the descendant with min key
         */
        getMinKeyDescendant() {
            if (this.left) {
                return this.left.getMinKeyDescendant();
            }
            else {
                return this;
            }
        }
        /**
         * Get the minimum key
         */
        getMinKey() {
            return this.getMinKeyDescendant().key;
        }
        /**
         * Check that all nodes (incl. leaves) fullfil condition given by fn
         * test is a function passed every (key, data) and which throws if the condition is not met
         */
        forEach(test) {
            if (!this.hasOwnProperty("key")) {
                return;
            }
            test(this.key, this.data);
            if (this.left) {
                this.left.forEach(test);
            }
            if (this.right) {
                this.right.forEach(test);
            }
        }
        /**
         * Check that the core BST properties on node ordering are verified
         * Throw if they aren't
         */
        checkNodeOrdering() {
            const self = this;
            if (!this.hasOwnProperty("key")) {
                return;
            }
            if (this.left) {
                this.left.forEach((k) => {
                    if (self.compareKeys(k, self.key) >= 0) {
                        throw new Error(`Tree with root ${self.key} is not a binary search tree`);
                    }
                });
                this.left.checkNodeOrdering();
            }
            if (this.right) {
                this.right.forEach((k) => {
                    if (self.compareKeys(k, self.key) <= 0) {
                        throw new Error(`Tree with root ${self.key} is not a binary search tree`);
                    }
                });
                this.right.checkNodeOrdering();
            }
        }
        /**
         * Check that all pointers are coherent in this tree
         */
        checkInternalPointers() {
            if (this.left) {
                if (this.left.parent !== this) {
                    throw new Error(`Parent pointer broken for key ${this.key}`);
                }
                this.left.checkInternalPointers();
            }
            if (this.right) {
                if (this.right.parent !== this) {
                    throw new Error(`Parent pointer broken for key ${this.key}`);
                }
                this.right.checkInternalPointers();
            }
        }
        /**
         * Check that a tree is a BST as defined here (node ordering and pointer references)
         */
        checkIsBST() {
            this.checkNodeOrdering();
            this.checkInternalPointers();
            if (this.parent) {
                throw new Error("The root shouldn't have a parent");
            }
        }
        /**
         * Get number of keys inserted
         */
        getNumberOfKeys() {
            if (!this.hasOwnProperty("key")) {
                return 0;
            }
            let res = 1;
            if (this.left) {
                res += this.left.getNumberOfKeys();
            }
            if (this.right) {
                res += this.right.getNumberOfKeys();
            }
            return res;
        }
        // ============================================
        // Methods used to actually work on the tree
        // ============================================
        /**
         * Create a BST similar (i.e. same options except for key and value) to the current one
         * Use the same constructor (i.e. BinarySearchTree, AVLTree etc)
         */
        createSimilar(options = {}) {
            options.unique = this.unique;
            options.compareKeys = this.compareKeys;
            options.checkValueEquality = this.checkValueEquality;
            return new this.constructor(options);
        }
        /**
         * Create the left child of this BST and return it
         */
        createLeftChild(options) {
            const leftChild = this.createSimilar(options);
            leftChild.parent = this;
            this.left = leftChild;
            return leftChild;
        }
        /**
         * Create the right child of this BST and return it
         */
        createRightChild(options) {
            const rightChild = this.createSimilar(options);
            rightChild.parent = this;
            this.right = rightChild;
            return rightChild;
        }
        /**
         * Insert a new element
         */
        insert(key, value) {
            // Empty tree, insert as root
            if (!this.hasOwnProperty("key")) {
                this.key = key;
                if (typeof value !== "undefined")
                    this.data.push(value);
                return;
            }
            // Same key as root
            if (this.compareKeys(this.key, key) === 0) {
                if (this.unique) {
                    const err = new Error(`Can't insert key ${key}, it violates the unique constraint`);
                    err.key = key;
                    err.errorType = "uniqueViolated";
                    throw err;
                }
                else {
                    if (typeof value !== "undefined")
                        this.data.push(value);
                }
                return;
            }
            const childNode = { key };
            if (isDef(value)) {
                childNode.value = value;
            }
            if (this.compareKeys(key, this.key) < 0) {
                // Insert in left subtree
                if (this.left) {
                    this.left.insert(key, value);
                }
                else {
                    this.createLeftChild(childNode);
                }
            }
            else {
                if (this.right) {
                    this.right.insert(key, value);
                }
                else {
                    this.createRightChild(childNode);
                }
            }
        }
        /**
         * Search for all data corresponding to a key
         */
        search(key) {
            if (!this.hasOwnProperty("key")) {
                return [];
            }
            if (this.compareKeys(this.key, key) === 0) {
                return this.data;
            }
            if (this.compareKeys(key, this.key) < 0) {
                if (this.left) {
                    return this.left.search(key);
                }
                else {
                    return [];
                }
            }
            else {
                if (this.right) {
                    return this.right.search(key);
                }
                else {
                    return [];
                }
            }
        }
        /**
         * Search for data coming right after a specific key
         */
        searchAfter(key) {
            if (!this.hasOwnProperty("key")) {
                return [];
            }
            if (this.compareKeys(this.key, key) === 0) {
                // if there's a right child, the next key will be there
                var cur = this.right;
                if (cur) {
                    // within the right branch, traverse left until leaf
                    while (cur.left)
                        cur = cur.left;
                    return cur.data;
                }
                // traverse up until you find a bigger key
                cur = this.parent;
                while (cur) {
                    if (this.compareKeys(key, cur.key) < 0)
                        return cur.data;
                    cur = cur.parent;
                }
                return [];
            }
            if (this.compareKeys(key, this.key) < 0) {
                if (this.left) {
                    return this.left.searchAfter(key);
                }
                else {
                    return this.data;
                }
            }
            else {
                if (this.right) {
                    return this.right.searchAfter(key);
                }
                else {
                    // traverse up until you find a bigger key
                    var cur = this.parent;
                    while (cur) {
                        if (this.compareKeys(key, cur.key) < 0)
                            return cur.data;
                        cur = cur.parent;
                    }
                    return [];
                }
            }
        }
        /**
         * Search for data coming right before a specific key
         */
        searchBefore(key) {
            if (!this.hasOwnProperty("key")) {
                return [];
            }
            if (this.compareKeys(this.key, key) === 0) {
                // if there's a left child, the previous key will be there
                var cur = this.left;
                if (cur) {
                    // within the left branch, traverse right until leaf
                    while (cur.right)
                        cur = cur.right;
                    return cur.data;
                }
                // traverse up until you find a smaller key
                cur = this.parent;
                while (cur) {
                    if (this.compareKeys(key, cur.key) > 0)
                        return cur.data;
                    cur = cur.parent;
                }
                return [];
            }
            if (this.compareKeys(key, this.key) < 0) {
                if (this.left) {
                    return this.left.searchBefore(key);
                }
                else {
                    // traverse up until you find a smaller key
                    var cur = this.parent;
                    while (cur) {
                        if (this.compareKeys(key, cur.key) > 0)
                            return cur.data;
                        cur = cur.parent;
                    }
                    return [];
                }
            }
            else {
                if (this.right) {
                    return this.right.searchBefore(key);
                }
                else {
                    return this.data;
                }
            }
        }
        /**
         * Search for all data corresponding to a specific key, if that key
         * does not exist, find the nearest key less than the specified key and its
         * associated data. Returns undefined if no such key&data can be found.
         **/
        searchNearestLte(key) {
            const nearest = this._searchNearestLte(key);
            return nearest ? nearest.data : undefined;
        }
        _searchNearestLte(key, nearestSoFar) {
            if (!this.hasOwnProperty("key")) {
                return undefined;
            }
            let nearest = undefined;
            if (typeof nearestSoFar != "undefined") {
                nearest = nearestSoFar;
            }
            if (this.compareKeys(key, this.key) === 0) {
                return this;
            }
            if ((nearest == undefined ||
                Math.abs(this.compareKeys(this.key, key)) <
                    Math.abs(this.compareKeys(key, nearest.key))) &&
                this.compareKeys(this.key, key) <= 0) {
                nearest = this;
            }
            if (this.compareKeys(key, this.key) < 0) {
                if (this.left) {
                    const leftCandidate = this.left._searchNearestLte(key, nearest);
                    if (leftCandidate != undefined &&
                        (nearest == undefined ||
                            Math.abs(this.compareKeys(leftCandidate.key, key)) <
                                Math.abs(this.compareKeys(key, nearest.key))) &&
                        this.compareKeys(leftCandidate.key, key) <= 0) {
                        nearest = leftCandidate;
                    }
                }
            }
            if (nearest == undefined || this.compareKeys(key, this.key) >= 0) {
                if (this.right) {
                    const rightCandidate = this.right._searchNearestLte(key, nearest);
                    if (rightCandidate != undefined &&
                        (nearest == undefined ||
                            Math.abs(this.compareKeys(rightCandidate.key, key)) <
                                Math.abs(this.compareKeys(key, nearest.key))) &&
                        this.compareKeys(rightCandidate.key, key) <= 0) {
                        nearest = rightCandidate;
                    }
                }
            }
            return nearest;
        }
        /**
         * Search for all data corresponding to a specific key, if that key
         * does not exist, find the nearest key greater than the specified key and its
         * associated data. Returns undefined if no such key&data can be found.
         **/
        searchNearestGte(key) {
            const nearest = this._searchNearestGte(key);
            return nearest ? nearest.data : undefined;
        }
        _searchNearestGte(key, nearestSoFar) {
            if (!this.hasOwnProperty("key")) {
                return undefined;
            }
            let nearest = undefined;
            if (typeof nearestSoFar != "undefined") {
                nearest = nearestSoFar;
            }
            if (this.compareKeys(key, this.key) === 0) {
                return this;
            }
            if ((nearest == undefined ||
                Math.abs(this.compareKeys(this.key, key)) <
                    Math.abs(this.compareKeys(key, nearest.key))) &&
                this.compareKeys(this.key, key) >= 0) {
                nearest = this;
            }
            if (this.compareKeys(key, this.key) < 0) {
                if (this.left) {
                    const leftCandidate = this.left._searchNearestGte(key, nearest);
                    if (leftCandidate != undefined &&
                        (nearest == undefined ||
                            Math.abs(this.compareKeys(leftCandidate.key, key)) <
                                Math.abs(this.compareKeys(key, nearest.key))) &&
                        this.compareKeys(leftCandidate.key, key) >= 0) {
                        nearest = leftCandidate;
                    }
                }
            }
            if (nearest == undefined || this.compareKeys(key, this.key) >= 0) {
                if (this.right) {
                    const rightCandidate = this.right._searchNearestGte(key, nearest);
                    if (rightCandidate != undefined &&
                        (nearest == undefined ||
                            Math.abs(this.compareKeys(rightCandidate.key, key)) <
                                Math.abs(this.compareKeys(key, nearest.key))) &&
                        this.compareKeys(rightCandidate.key, key) >= 0) {
                        nearest = rightCandidate;
                    }
                }
            }
            return nearest;
        }
        /**
         * Search for all data corresponding to a specific key, if that key
         * does not exist, find the nearest key and associated data.
         */
        searchNearest(key) {
            const nearest = this._searchNearest(key);
            return nearest ? nearest.data : undefined;
        }
        _searchNearest(key, nearestSoFar) {
            if (!this.hasOwnProperty("key")) {
                return undefined;
            }
            let nearest = undefined;
            if (typeof nearestSoFar != "undefined") {
                nearest = nearestSoFar;
            }
            if (this.compareKeys(key, this.key) === 0) {
                return this;
            }
            if (nearest == undefined ||
                Math.abs(this.compareKeys(this.key, key)) <
                    Math.abs(this.compareKeys(key, nearest.key))) {
                nearest = this;
            }
            if (this.compareKeys(key, this.key) < 0) {
                if (this.left) {
                    const leftCandidate = this.left._searchNearest(key, nearest);
                    if (leftCandidate != undefined &&
                        (nearest == undefined ||
                            Math.abs(this.compareKeys(leftCandidate.key, key)) <
                                Math.abs(this.compareKeys(key, nearest.key)))) {
                        nearest = leftCandidate;
                    }
                }
            }
            else {
                if (this.right) {
                    const rightCandidate = this.right._searchNearest(key, nearest);
                    if (rightCandidate != undefined &&
                        (nearest == undefined ||
                            Math.abs(this.compareKeys(rightCandidate.key, key)) <
                                Math.abs(this.compareKeys(key, nearest.key)))) {
                        nearest = rightCandidate;
                    }
                }
            }
            return nearest;
        }
        /**
         * Return a function that tells whether a given key matches a lower bound
         */
        getLowerBoundMatcher(query) {
            const bst = this;
            // No lower bound
            if (!query.hasOwnProperty("$gt") && !query.hasOwnProperty("$gte")) {
                return () => true;
            }
            if (query.hasOwnProperty("$gt") && query.hasOwnProperty("$gte")) {
                if (bst.compareKeys(query.$gte, query.$gt) === 0) {
                    return (key) => bst.compareKeys(key, query.$gt) > 0;
                }
                if (bst.compareKeys(query.$gte, query.$gt) > 0) {
                    return (key) => bst.compareKeys(key, query.$gte) >= 0;
                }
                else {
                    return (key) => bst.compareKeys(key, query.$gt) > 0;
                }
            }
            if (query.hasOwnProperty("$gt")) {
                return (key) => bst.compareKeys(key, query.$gt) > 0;
            }
            else {
                return (key) => bst.compareKeys(key, query.$gte) >= 0;
            }
        }
        /**
         * Return a function that tells whether a given key matches an upper bound
         */
        getUpperBoundMatcher(query) {
            const self = this;
            // No lower bound
            if (!query.hasOwnProperty("$lt") && !query.hasOwnProperty("$lte")) {
                return () => true;
            }
            if (query.hasOwnProperty("$lt") && query.hasOwnProperty("$lte")) {
                if (self.compareKeys(query.$lte, query.$lt) === 0) {
                    return (key) => self.compareKeys(key, query.$lt) < 0;
                }
                if (self.compareKeys(query.$lte, query.$lt) < 0) {
                    return (key) => self.compareKeys(key, query.$lte) <= 0;
                }
                else {
                    return (key) => self.compareKeys(key, query.$lt) < 0;
                }
            }
            if (query.hasOwnProperty("$lt")) {
                return (key) => self.compareKeys(key, query.$lt) < 0;
            }
            else {
                return (key) => self.compareKeys(key, query.$lte) <= 0;
            }
        }
        /**
         * Get all data for a key between bounds
         * Return it in key order
         */
        betweenBounds(query, lbm, ubm) {
            let res = [];
            if (!this.hasOwnProperty("key")) {
                return [];
            }
            lbm = lbm || this.getLowerBoundMatcher(query);
            ubm = ubm || this.getUpperBoundMatcher(query);
            if (lbm(this.key) && this.left) {
                res = res.concat(this.left.betweenBounds(query, lbm, ubm));
            }
            if (lbm(this.key) && ubm(this.key)) {
                res = res.concat(this.data);
            }
            if (ubm(this.key) && this.right) {
                res = res.concat(this.right.betweenBounds(query, lbm, ubm));
            }
            return res;
        }
        /**
         * Delete the current node if it is a leaf
         * Return true if it was deleted
         */
        deleteIfLeaf() {
            if (this.left || this.right) {
                return false;
            }
            // The leaf is itself a root
            if (!this.parent) {
                delete this.key;
                this.data = [];
                return true;
            }
            if (this.parent.left === this) {
                this.parent.left = undefined;
            }
            else {
                this.parent.right = undefined;
            }
            return true;
        }
        /**
         * Delete the current node if it has only one child
         * Return true if it was deleted
         */
        deleteIfOnlyOneChild() {
            let child;
            if (this.left && !this.right) {
                child = this.left;
            }
            if (!this.left && this.right) {
                child = this.right;
            }
            if (!child) {
                return false;
            }
            // Root
            if (!this.parent) {
                this.key = child.key;
                this.data = child.data;
                this.left = undefined;
                if (child.left) {
                    this.left = child.left;
                    child.left.parent = this;
                }
                this.right = undefined;
                if (child.right) {
                    this.right = child.right;
                    child.right.parent = this;
                }
                return true;
            }
            if (this.parent.left === this) {
                this.parent.left = child;
                child.parent = this.parent;
            }
            else {
                this.parent.right = child;
                child.parent = this.parent;
            }
            return true;
        }
        /**
         * Delete a key or just a value
         */
        delete(key, value) {
            if (!this.hasOwnProperty("key")) {
                return;
            }
            if (this.compareKeys(key, this.key) < 0) {
                if (this.left) {
                    this.left.delete(key, value);
                }
                return;
            }
            if (this.compareKeys(key, this.key) > 0) {
                if (this.right) {
                    this.right.delete(key, value);
                }
                return;
            }
            if (this.compareKeys(key, this.key) !== 0) {
                return;
            }
            // Delete only a value
            if (this.data.length > 1 && isDef(value)) {
                this.data = this.data.filter((d) => {
                    return !this.checkValueEquality(d, value);
                });
                return;
            }
            // Delete the whole node
            if (this.deleteIfLeaf()) {
                return;
            }
            if (this.deleteIfOnlyOneChild()) {
                return;
            }
            // We are in the case where the node to delete has two children
            if (Math.random() >= 0.5 && this.left) {
                // Randomize replacement to avoid unbalancing the tree too much
                // Use the in-order predecessor
                let replaceWith = this.left.getMaxKeyDescendant();
                this.key = replaceWith.key;
                this.data = replaceWith.data;
                if (this === replaceWith.parent) {
                    // Special case
                    this.left = replaceWith.left;
                    if (replaceWith.left) {
                        replaceWith.left.parent = replaceWith.parent;
                    }
                }
                else if (replaceWith.parent) {
                    replaceWith.parent.right = replaceWith.left;
                    if (replaceWith.left) {
                        replaceWith.left.parent = replaceWith.parent;
                    }
                }
            }
            else if (this.right) {
                // Use the in-order successor
                let replaceWith = this.right.getMinKeyDescendant();
                this.key = replaceWith.key;
                this.data = replaceWith.data;
                if (this === replaceWith.parent) {
                    // Special case
                    this.right = replaceWith.right;
                    if (replaceWith.right) {
                        replaceWith.right.parent = replaceWith.parent;
                    }
                }
                else if (replaceWith.parent) {
                    replaceWith.parent.left = replaceWith.right;
                    if (replaceWith.right) {
                        replaceWith.right.parent = replaceWith.parent;
                    }
                }
            }
        }
        /**
         * Execute a function on every node of the tree, in key order
         */
        executeOnEveryNode(fn) {
            if (this.left) {
                this.left.executeOnEveryNode(fn);
            }
            fn(this);
            if (this.right) {
                this.right.executeOnEveryNode(fn);
            }
        }
        /**
         * Pretty print a tree
         */
        prettyPrint(printData, spacing = "") {
            console.log(`${spacing}* ${this.key}`);
            if (printData) {
                console.log(`${spacing}* ${this.data}`);
            }
            if (!this.left && !this.right) {
                return;
            }
            if (this.left) {
                this.left.prettyPrint(printData, `${spacing}  `);
            }
            else {
                console.log(`${spacing}  *`);
            }
            if (this.right) {
                this.right.prettyPrint(printData, `${spacing}  `);
            }
            else {
                console.log(`${spacing}  *`);
            }
        }
    }

    /**
     * Self-balancing binary search tree using the AVL implementation
     */
    class AVLTree {
        constructor(options) {
            this.tree = new Node(options);
        }
        checkIsAVLT() {
            this.tree.checkIsAVLT();
        }
        // Insert in the internal tree, update the pointer to the root if needed
        insert(key, value) {
            const newTree = this.tree.insert(key, value);
            // If newTree is undefined, that means its structure was not modified
            if (newTree) {
                this.tree = newTree;
            }
        }
        // Delete a value
        delete(key, value) {
            const newTree = this.tree.delete(key, value);
            // If newTree is undefined, that means its structure was not modified
            if (newTree) {
                this.tree = newTree;
            }
        }
        getNumberOfKeys() {
            return this.tree.getNumberOfKeys();
        }
        getMinKey() {
            return this.tree.getMinKey();
        }
        getMaxKey() {
            return this.tree.getMaxKey();
        }
        search(key) {
            return this.tree.search(key);
        }
        searchAfter(k) {
            return this.tree.searchAfter(k);
        }
        searchBefore(k) {
            return this.tree.searchBefore(k);
        }
        searchNearest(k) {
            return this.tree.searchNearest(k);
        }
        searchNearestLte(k) {
            return this.tree.searchNearestLte(k);
        }
        searchNearestGte(k) {
            return this.tree.searchNearestGte(k);
        }
        betweenBounds(query, lbm, ubm) {
            return this.tree.betweenBounds(query, lbm, ubm);
        }
        prettyPrint(printData, spacing) {
            return this.tree.prettyPrint(printData, spacing);
        }
        executeOnEveryNode(fn) {
            return this.tree.executeOnEveryNode(fn);
        }
    }
    /**
     * Node
     */
    class Node extends BST {
        constructor(init = {}) {
            super(init);
            this.height = 0;
            this.left = init.left;
            this.right = init.right;
            this.parent = init.parent;
            if (init.hasOwnProperty("key")) {
                this.key = init.key;
            }
            this.data = init.hasOwnProperty("value") ? [init.value] : [];
            this.unique = init.unique || false;
            this.compareKeys = init.compareKeys || defaultCompareKeysFunction;
            this.checkValueEquality =
                init.checkValueEquality || defaultCheckValueEquality;
        }
        /**
         * Check the recorded height is correct for every node
         * Throws if one height doesn't match
         */
        checkHeightCorrect() {
            let leftH;
            let rightH;
            if (!this.hasOwnProperty("key")) {
                return;
            } // Empty tree
            if (this.left && this.left.height === undefined) {
                throw new Error(`Undefined height for node ${this.left.key}`);
            }
            if (this.right && this.right.height === undefined) {
                throw new Error(`Undefined height for node ${this.right.key}`);
            }
            if (this.height === undefined) {
                throw new Error(`Undefined height for node ${this.key}`);
            }
            leftH = this.left ? this.left.height || 0 : 0;
            rightH = this.right ? this.right.height || 0 : 0;
            if (this.height !== 1 + Math.max(leftH, rightH)) {
                throw new Error(`Height constraint failed for node ${this.key}`);
            }
            if (this.left) {
                this.left.checkHeightCorrect();
            }
            if (this.right) {
                this.right.checkHeightCorrect();
            }
        }
        /**
         * Return the balance factor
         */
        balanceFactor() {
            const leftH = this.left ? this.left.height : 0;
            const rightH = this.right ? this.right.height : 0;
            return leftH - rightH;
        }
        /**
         * Check that the balance factors are all between -1 and 1
         */
        checkBalanceFactors() {
            if (Math.abs(this.balanceFactor()) > 1) {
                throw new Error(`Tree is unbalanced at node ${this.key}`);
            }
            if (this.left) {
                this.left.checkBalanceFactors();
            }
            if (this.right) {
                this.right.checkBalanceFactors();
            }
        }
        /**
         * When checking if the BST conditions are met, also check that the heights are correct
         * and the tree is balanced
         */
        checkIsAVLT() {
            this.checkIsBST.call(this);
            this.checkHeightCorrect();
            this.checkBalanceFactors();
        }
        /**
         * Perform a right rotation of the tree if possible
         * and return the root of the resulting tree
         * The resulting tree's nodes' heights are also updated
         */
        rightRotation() {
            const q = this;
            const p = this.left;
            let b;
            let ah;
            let bh;
            let ch;
            if (!p) {
                return this;
            } // No change
            b = p.right;
            // Alter tree structure
            if (q.parent) {
                p.parent = q.parent;
                if (q.parent.left === q) {
                    q.parent.left = p;
                }
                else {
                    q.parent.right = p;
                }
            }
            else {
                p.parent = undefined;
            }
            p.right = q;
            q.parent = p;
            q.left = b;
            if (b) {
                b.parent = q;
            }
            // Update heights
            ah = p.left ? p.left.height : 0;
            bh = b ? b.height : 0;
            ch = q.right ? q.right.height : 0;
            q.height = Math.max(bh, ch) + 1;
            p.height = Math.max(ah, q.height) + 1;
            return p;
        }
        /**
         * Perform a left rotation of the tree if possible
         * and return the root of the resulting tree
         * The resulting tree's nodes' heights are also updated
         */
        leftRotation() {
            const p = this;
            const q = this.right;
            let b;
            let ah;
            let bh;
            let ch;
            if (!q) {
                return this;
            } // No change
            b = q.left;
            // Alter tree structure
            if (p.parent) {
                q.parent = p.parent;
                if (p.parent.left === p) {
                    p.parent.left = q;
                }
                else {
                    p.parent.right = q;
                }
            }
            else {
                q.parent = undefined;
            }
            q.left = p;
            p.parent = q;
            p.right = b;
            if (b) {
                b.parent = p;
            }
            // Update heights
            ah = p.left ? p.left.height : 0;
            bh = b ? b.height : 0;
            ch = q.right ? q.right.height : 0;
            p.height = Math.max(ah, bh) + 1;
            q.height = Math.max(ch, p.height) + 1;
            return q;
        }
        /**
         * Modify the tree if its right subtree is too small compared to the left
         * Return the new root if any
         */
        rightTooSmall() {
            if (this.balanceFactor() <= 1) {
                return this;
            } // Right is not too small, don't change
            if (this.left && this.left.balanceFactor() < 0) {
                this.left.leftRotation();
            }
            return this.rightRotation();
        }
        /**
         * Modify the tree if its left subtree is too small compared to the right
         * Return the new root if any
         */
        leftTooSmall() {
            if (this.balanceFactor() >= -1) {
                return this;
            } // Left is not too small, don't change
            if (this.right && this.right.balanceFactor() > 0) {
                this.right.rightRotation();
            }
            return this.leftRotation();
        }
        /**
         * Rebalance the tree along the given path. The path is given reversed (as he was calculated
         * in the insert and delete functions).
         * Returns the new root of the tree
         * Of course, the first element of the path must be the root of the tree
         */
        rebalanceAlongPath(path) {
            let newRoot = this;
            let rotated;
            let i;
            if (!this.hasOwnProperty("key")) {
                delete this.height;
                return this;
            } // Empty tree
            // Rebalance the tree and update all heights
            for (i = path.length - 1; i >= 0; i -= 1) {
                let t = path[i];
                path[i].height =
                    1 +
                        Math.max(t.left ? t.left.height : 0, t.right ? t.right.height : 0);
                if (path[i].balanceFactor() > 1) {
                    rotated = path[i].rightTooSmall();
                    if (i === 0) {
                        newRoot = rotated;
                    }
                }
                if (path[i].balanceFactor() < -1) {
                    rotated = path[i].leftTooSmall();
                    if (i === 0) {
                        newRoot = rotated;
                    }
                }
            }
            return newRoot;
        }
        /**
         * Insert a key, value pair in the tree while maintaining the AVL tree height constraint
         * Return a pointer to the root node, which may have changed
         */
        insert(key, value) {
            const insertPath = [];
            let currentNode = this;
            // Empty tree, insert as root
            if (!this.hasOwnProperty("key")) {
                this.key = key;
                this.data.push(value);
                this.height = 1;
                return this;
            }
            // Insert new leaf at the right place
            while (true) {
                // Same key: no change in the tree structure
                if (currentNode.compareKeys(currentNode.key, key) === 0) {
                    if (currentNode.unique) {
                        const err = new Error(`Can't insert key ${key}, it violates the unique constraint`);
                        err.key = key;
                        err.errorType = "uniqueViolated";
                        throw err;
                    }
                    else {
                        currentNode.data.push(value);
                    }
                    return this;
                }
                insertPath.push(currentNode);
                if (currentNode.compareKeys(key, currentNode.key) < 0) {
                    if (!currentNode.left) {
                        insertPath.push(currentNode.createLeftChild({ key, value }));
                        break;
                    }
                    else {
                        currentNode = currentNode.left;
                    }
                }
                else {
                    if (!currentNode.right) {
                        insertPath.push(currentNode.createRightChild({ key, value }));
                        break;
                    }
                    else {
                        currentNode = currentNode.right;
                    }
                }
            }
            return this.rebalanceAlongPath(insertPath);
        }
        /**
         * Delete a key or just a value and return the new root of the tree
         */
        delete(key, value) {
            const newData = [];
            let currentNode = this;
            const deletePath = [];
            if (!this.hasOwnProperty("key")) {
                return this;
            } // Empty tree
            // Either no match is found and the function will return from within the loop
            // Or a match is found and deletePath will contain the path from the root to the node to delete after the loop
            while (true) {
                if (currentNode.compareKeys(key, currentNode.key) === 0) {
                    break;
                }
                deletePath.push(currentNode);
                if (currentNode.compareKeys(key, currentNode.key) < 0) {
                    if (currentNode.left) {
                        currentNode = currentNode.left;
                    }
                    else {
                        return this; // Key not found, no modification
                    }
                }
                else {
                    // currentNode.compareKeys(key, currentNode.key) is > 0
                    if (currentNode.right) {
                        currentNode = currentNode.right;
                    }
                    else {
                        return this; // Key not found, no modification
                    }
                }
            }
            // Delete only a value (no tree modification)
            if (currentNode.data.length > 1 && value !== undefined) {
                currentNode.data.forEach((d) => {
                    if (!currentNode.checkValueEquality(d, value)) {
                        newData.push(d);
                    }
                });
                currentNode.data = newData;
                return this;
            }
            // Delete a whole node
            // Leaf
            if (!currentNode.left && !currentNode.right) {
                if (currentNode === this) {
                    // This leaf is also the root
                    delete currentNode.key;
                    currentNode.data = [];
                    delete currentNode.height;
                    return this;
                }
                else if (currentNode.parent) {
                    if (currentNode.parent.left === currentNode) {
                        currentNode.parent.left = undefined;
                    }
                    else if (currentNode.parent) {
                        currentNode.parent.right = undefined;
                    }
                    return this.rebalanceAlongPath(deletePath);
                }
            }
            // Node with only one child
            if (!currentNode.left || !currentNode.right) {
                let replaceWith = currentNode.left
                    ? currentNode.left
                    : currentNode.right;
                if (replaceWith) {
                    if (currentNode === this) {
                        // This node is also the root
                        replaceWith.parent = undefined;
                        return replaceWith; // height of replaceWith is necessarily 1 because the tree was balanced before deletion
                    }
                    else if (currentNode.parent) {
                        if (currentNode.parent.left === currentNode) {
                            currentNode.parent.left = replaceWith;
                            replaceWith.parent = currentNode.parent;
                        }
                        else {
                            currentNode.parent.right = replaceWith;
                            replaceWith.parent = currentNode.parent;
                        }
                        return this.rebalanceAlongPath(deletePath);
                    }
                }
            }
            // Node with two children
            // Use the in-order predecessor (no need to randomize since we actively rebalance)
            deletePath.push(currentNode);
            let replaceWith = currentNode.left;
            if (replaceWith) {
                // Special case: the in-order predecessor is right below the node to delete
                if (!replaceWith.right) {
                    currentNode.key = replaceWith.key;
                    currentNode.data = replaceWith.data;
                    currentNode.left = replaceWith.left;
                    if (replaceWith.left) {
                        replaceWith.left.parent = currentNode;
                    }
                    return this.rebalanceAlongPath(deletePath);
                }
                // After this loop, replaceWith is the right-most leaf in the left subtree
                // and deletePath the path from the root (inclusive) to replaceWith (exclusive)
                while (true) {
                    if (replaceWith.right) {
                        deletePath.push(replaceWith);
                        replaceWith = replaceWith.right;
                    }
                    else {
                        break;
                    }
                }
                currentNode.key = replaceWith.key;
                currentNode.data = replaceWith.data;
                if (replaceWith.parent) {
                    replaceWith.parent.right = replaceWith.left;
                }
                if (replaceWith.left) {
                    replaceWith.left.parent = replaceWith.parent;
                }
            }
            return this.rebalanceAlongPath(deletePath);
        }
    }

    /**
     * Two indexed pointers are equal iif they point to the same place
     */
    function checkValueEquality(a, b) {
        return a === b;
    }
    /**
     * Type-aware projection
     */
    function projectForUnique(elt) {
        if (elt === null) {
            return "$NU";
        }
        if (typeof elt === "string") {
            return "$ST" + elt;
        }
        if (typeof elt === "boolean") {
            return "$BO" + elt;
        }
        if (typeof elt === "number") {
            return "$NO" + elt;
        }
        if (elt instanceof Date) {
            return "$DA" + elt.getTime();
        }
        return elt; // Arrays and objects, will check for pointer equality
    }
    function uniqueProjectedKeys(key) {
        return Array.from(new Set(key.map((x) => projectForUnique(x)))).map((key) => {
            if (typeof key === "string") {
                return key.substr(3);
            }
            else
                return key;
        });
    }
    class Index {
        constructor({ fieldName, unique, sparse, }) {
            this.fieldName = "";
            this.unique = false;
            this.sparse = false;
            this.treeOptions = {
                unique: this.unique,
                compareKeys: compareThings,
                checkValueEquality,
            };
            if (fieldName) {
                this.fieldName = fieldName;
            }
            if (unique) {
                this.unique = unique;
                this.treeOptions.unique = unique;
            }
            if (sparse) {
                this.sparse = sparse;
            }
            this.tree = new AVLTree(this.treeOptions);
        }
        reset() {
            this.tree = new AVLTree(this.treeOptions);
        }
        /**
         * Insert a new document in the index
         * If an array is passed, we insert all its elements (if one insertion fails the index is not modified)
         * O(log(n))
         */
        insert(doc) {
            if (Array.isArray(doc)) {
                this.insertMultipleDocs(doc);
                return;
            }
            let key = getDotValue(doc, this.fieldName);
            // We don't index documents that don't contain the field if the index is sparse
            if (key === undefined && this.sparse) {
                return;
            }
            if (!Array.isArray(key)) {
                this.tree.insert(key, doc);
            }
            else {
                // If an insert fails due to a unique constraint, roll back all inserts before it
                let keys = uniqueProjectedKeys(key);
                let error;
                let failingIndex = -1;
                for (let i = 0; i < keys.length; i++) {
                    try {
                        this.tree.insert(keys[i], doc);
                    }
                    catch (e) {
                        error = e;
                        failingIndex = i;
                        break;
                    }
                }
                if (error) {
                    for (let i = 0; i < failingIndex; i++) {
                        this.tree.delete(keys[i], doc);
                    }
                    throw error;
                }
            }
        }
        /**
         * Insert an array of documents in the index
         * If a constraint is violated, the changes should be rolled back and an error thrown
         *
         */
        insertMultipleDocs(docs) {
            let error;
            let failingI = -1;
            for (let i = 0; i < docs.length; i++) {
                try {
                    this.insert(docs[i]);
                }
                catch (e) {
                    error = e;
                    failingI = i;
                    break;
                }
            }
            if (error) {
                for (let i = 0; i < failingI; i++) {
                    this.remove(docs[i]);
                }
                throw error;
            }
        }
        /**
         * Remove a document from the index
         * If an array is passed, we remove all its elements
         * The remove operation is safe with regards to the 'unique' constraint
         * O(log(n))
         */
        remove(doc) {
            if (Array.isArray(doc)) {
                doc.forEach((d) => this.remove(d));
                return;
            }
            let key = getDotValue(doc, this.fieldName);
            if (key === undefined && this.sparse) {
                return;
            }
            if (!Array.isArray(key)) {
                this.tree.delete(key, doc);
            }
            else {
                uniqueProjectedKeys(key).forEach((_key) => this.tree.delete(_key, doc));
            }
        }
        /**
         * Update a document in the index
         * If a constraint is violated, changes are rolled back and an error thrown
         * Naive implementation, still in O(log(n))
         */
        update(oldDoc, newDoc) {
            if (Array.isArray(oldDoc)) {
                this.updateMultipleDocs(oldDoc);
                return;
            }
            else if (newDoc) {
                this.remove(oldDoc);
                try {
                    this.insert(newDoc);
                }
                catch (e) {
                    this.insert(oldDoc);
                    throw e;
                }
            }
        }
        /**
         * Update multiple documents in the index
         * If a constraint is violated, the changes need to be rolled back
         * and an error thrown
         */
        updateMultipleDocs(pairs) {
            let failingI = -1;
            let error;
            for (let i = 0; i < pairs.length; i++) {
                this.remove(pairs[i].oldDoc);
            }
            for (let i = 0; i < pairs.length; i++) {
                try {
                    this.insert(pairs[i].newDoc);
                }
                catch (e) {
                    error = e;
                    failingI = i;
                    break;
                }
            }
            // If an error was raised, roll back changes in the inverse order
            if (error) {
                for (let i = 0; i < failingI; i++) {
                    this.remove(pairs[i].newDoc);
                }
                for (let i = 0; i < pairs.length; i++) {
                    this.insert(pairs[i].oldDoc);
                }
                throw error;
            }
        }
        /**
         * Revert an update
         */
        revertUpdate(oldDoc, newDoc) {
            var revert = [];
            if (!Array.isArray(oldDoc) && newDoc) {
                this.update(newDoc, oldDoc);
            }
            else if (Array.isArray(oldDoc)) {
                oldDoc.forEach((pair) => {
                    revert.push({ oldDoc: pair.newDoc, newDoc: pair.oldDoc });
                });
                this.update(revert);
            }
        }
        /**
         * Get all documents in index whose key match value (if it is a Thing) or one of the elements of value (if it is an array of Things)
         */
        getMatching(key) {
            if (!Array.isArray(key)) {
                return this.tree.search(key);
            }
            else {
                let res = [];
                let resHT = {};
                key.forEach((v) => {
                    this.getMatching(v).forEach((doc) => {
                        if (doc._id) {
                            resHT[doc._id] = doc;
                        }
                    });
                });
                Object.keys(resHT).forEach(function (_id) {
                    res.push(resHT[_id]);
                });
                return res;
            }
        }
        getAll() {
            let data = [];
            this.tree.executeOnEveryNode(function (node) {
                for (let i = 0; i < node.data.length; i++) {
                    data.push(node.data[i]);
                }
            });
            return data;
        }
        getBetweenBounds(query) {
            return this.tree.betweenBounds(query);
        }
    }

    class PersistenceEvent {
        constructor() {
            this.callbacks = {
                readLine: [],
                writeLine: [],
                end: [],
            };
        }
        on(event, cb) {
            if (!this.callbacks[event])
                this.callbacks[event] = [];
            this.callbacks[event].push(cb);
        }
        emit(event, data) {
            return __awaiter(this, void 0, void 0, function* () {
                let cbs = this.callbacks[event];
                if (cbs) {
                    for (let i = 0; i < cbs.length; i++) {
                        const cb = cbs[i];
                        yield cb(data);
                    }
                }
            });
        }
    }
    /**
     * Create a new Persistence object for database options.db
     */
    class Persistence {
        constructor(options) {
            this.ref = "";
            this.corruptAlertThreshold = 0.1;
            this.afterSerialization = (s) => s;
            this.beforeDeserialization = (s) => s;
            this._memoryIndexes = [];
            this._memoryData = [];
            this._model = options.model;
            this.db = options.db;
            this.ref = this.db.ref;
            this.corruptAlertThreshold =
                options.corruptAlertThreshold !== undefined
                    ? options.corruptAlertThreshold
                    : 0.1;
            if (this.ref && this.ref.charAt(this.ref.length - 1) === "~") {
                throw new Error("The datafile name can't end with a ~, which is reserved for crash safe backup files");
            }
            // After serialization and before deserialization hooks with some basic sanity checks
            if (options.afterSerialization && !options.beforeDeserialization) {
                throw new Error("Serialization hook defined but deserialization hook undefined, cautiously refusing to start Datastore to prevent dataloss");
            }
            if (!options.afterSerialization && options.beforeDeserialization) {
                throw new Error("Serialization hook undefined but deserialization hook defined, cautiously refusing to start Datastore to prevent dataloss");
            }
            this.afterSerialization =
                options.afterSerialization || this.afterSerialization;
            this.beforeDeserialization =
                options.beforeDeserialization || this.beforeDeserialization;
            let randomString$1 = randomString(113);
            if (this.beforeDeserialization(this.afterSerialization(randomString$1)) !== randomString$1) {
                throw new Error("beforeDeserialization is not the reverse of afterSerialization, cautiously refusing to start data store to prevent dataloss");
            }
            this.init();
        }
        persistAllIndexes() {
            return __awaiter(this, void 0, void 0, function* () {
                const emitter = new PersistenceEvent();
                yield this.rewriteIndexes(emitter);
                const allKeys = Object.keys(this.db.indexes);
                for (let i = 0; i < allKeys.length; i++) {
                    const fieldName = allKeys[i];
                    if (fieldName !== "_id") {
                        // The special _id index is managed by datastore.ts, the others need to be persisted
                        yield emitter.emit("writeLine", this.afterSerialization(serialize({
                            $$indexCreated: {
                                fieldName,
                                unique: this.db.indexes[fieldName].unique,
                                sparse: this.db.indexes[fieldName].sparse,
                            },
                        })));
                    }
                }
                yield emitter.emit("end", "");
            });
        }
        persistAllData() {
            return __awaiter(this, void 0, void 0, function* () {
                const emitter = new PersistenceEvent();
                yield this.rewriteData(emitter);
                const allData = this.db.getAllData();
                for (let i = 0; i < allData.length; i++) {
                    const doc = allData[i];
                    yield emitter.emit("writeLine", this.afterSerialization(serialize(doc)));
                }
                yield emitter.emit("end", "");
            });
        }
        persistCachedDatabase() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.persistAllData();
                yield this.persistAllIndexes();
            });
        }
        /**
         * Queue a rewrite of the datafile
         */
        compactDatafile() {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.db.q.add(() => this.persistCachedDatabase());
            });
        }
        /**
         * Set automatic compaction every interval ms
         */
        setAutocompactionInterval(interval) {
            const minInterval = 5000;
            const realInterval = Math.max(interval || 0, minInterval);
            this.stopAutocompaction();
            this.autocompactionIntervalId = setInterval(() => {
                this.compactDatafile();
            }, realInterval);
        }
        /**
         * Stop autocompaction (do nothing if autocompaction was not running)
         */
        stopAutocompaction() {
            if (this.autocompactionIntervalId) {
                clearInterval(this.autocompactionIntervalId);
            }
        }
        persistByAppendNewIndex(newDocs) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < newDocs.length; i++) {
                    const doc = newDocs[i];
                    yield this.appendIndex(this.afterSerialization(serialize(doc)));
                }
            });
        }
        persistByAppendNewData(newDocs) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < newDocs.length; i++) {
                    const doc = newDocs[i];
                    yield this.appendData(this.afterSerialization(serialize(doc)));
                }
            });
        }
        treatSingleLine(line) {
            let treatedLine;
            try {
                treatedLine = deserialize(this.beforeDeserialization(line));
                if (this._model) {
                    treatedLine = this._model.new(treatedLine);
                }
            }
            catch (e) {
                return {
                    type: "corrupt",
                    status: "remove",
                    data: false,
                };
            }
            if (treatedLine._id) {
                if (treatedLine.$$deleted === true) {
                    return {
                        type: "doc",
                        status: "remove",
                        data: { _id: treatedLine._id },
                    };
                }
                else {
                    return {
                        type: "doc",
                        status: "add",
                        data: treatedLine,
                    };
                }
            }
            else if (treatedLine.$$indexCreated &&
                treatedLine.$$indexCreated.fieldName !== undefined) {
                return {
                    type: "index",
                    status: "add",
                    data: {
                        fieldName: treatedLine.$$indexCreated.fieldName,
                        data: treatedLine.$$indexCreated,
                    },
                };
            }
            else if (typeof treatedLine.$$indexRemoved === "string") {
                return {
                    type: "index",
                    status: "remove",
                    data: { fieldName: treatedLine.$$indexRemoved },
                };
            }
            else {
                return {
                    type: "corrupt",
                    status: "remove",
                    data: true,
                };
            }
        }
        /**
         * Load the database
         * 1) Create all indexes
         * 2) Insert all data
         * This means pulling data out of the data file or creating it if it doesn't exist
         */
        loadDatabase() {
            return __awaiter(this, void 0, void 0, function* () {
                this.db.q.pause();
                this.db.resetIndexes();
                const indexesEmitter = new PersistenceEvent();
                let corrupt = 0;
                let processed = 0;
                let err;
                indexesEmitter.on("readLine", (line) => __awaiter(this, void 0, void 0, function* () {
                    processed++;
                    const treatedLine = this.treatSingleLine(line);
                    if (treatedLine.type === "index") {
                        if (treatedLine.status === "add") {
                            this.db.indexes[treatedLine.data.fieldName] = new Index(treatedLine.data.data);
                        }
                        if (treatedLine.status === "remove") {
                            delete this.db.indexes[treatedLine.data.fieldName];
                        }
                    }
                    else if (!treatedLine.data) {
                        corrupt++;
                    }
                }));
                yield this.readIndexes(indexesEmitter);
                const dataEmitter = new PersistenceEvent();
                dataEmitter.on("readLine", (line) => __awaiter(this, void 0, void 0, function* () {
                    processed++;
                    const treatedLine = this.treatSingleLine(line);
                    if (treatedLine.type === "doc") {
                        if (treatedLine.status === "add") {
                            try {
                                this.db.addToIndexes(treatedLine.data);
                            }
                            catch (e) {
                                // hacky way of dealing with updates
                                if (e.toString().indexOf(treatedLine.data._id) !== -1) {
                                    this.db.removeFromIndexes(treatedLine.data);
                                    this.db.addToIndexes(treatedLine.data);
                                }
                                else {
                                    err = e;
                                }
                            }
                        }
                        if (treatedLine.status === "remove") {
                            this.db.removeFromIndexes(treatedLine.data);
                        }
                    }
                    else if (!treatedLine.data) {
                        corrupt++;
                    }
                }));
                yield this.readData(dataEmitter);
                if (processed > 0 && corrupt / processed > this.corruptAlertThreshold) {
                    throw new Error(`More than ${Math.floor(100 * this.corruptAlertThreshold)}% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start Datastore to prevent dataloss`);
                }
                else if (err) {
                    throw err;
                }
                this.db.q.start();
                return true;
            });
        }
        init() {
            return __awaiter(this, void 0, void 0, function* () { });
        }
        readIndexes(event) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let index = 0; index < this._memoryIndexes.length; index++) {
                    const line = this._memoryIndexes[index];
                    event.emit("readLine", line);
                }
            });
        }
        readData(event) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let index = 0; index < this._memoryData.length; index++) {
                    const line = this._memoryData[index];
                    event.emit("readLine", line);
                }
            });
        }
        rewriteIndexes(event) {
            return __awaiter(this, void 0, void 0, function* () {
                this._memoryIndexes = [];
                event.on("writeLine", (data) => __awaiter(this, void 0, void 0, function* () {
                    this._memoryIndexes.push(data);
                }));
            });
        }
        rewriteData(event) {
            return __awaiter(this, void 0, void 0, function* () {
                this._memoryData = [];
                event.on("writeLine", (data) => __awaiter(this, void 0, void 0, function* () {
                    this._memoryData.push(data);
                }));
            });
        }
        appendIndex(data) {
            return __awaiter(this, void 0, void 0, function* () {
                this._memoryIndexes.push(data);
            });
        }
        appendData(data) {
            return __awaiter(this, void 0, void 0, function* () {
                this._memoryData.push(data);
            });
        }
        forcefulUnlock() {
            return __awaiter(this, void 0, void 0, function* () { });
        }
    }

    class BaseModel {
        constructor() {
            this._id = uid();
        }
        static new(data) {
            const instance = new this();
            const keys = Object.keys(data);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                instance[key] = data[key];
            }
            return instance;
        }
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var eventemitter3 = createCommonjsModule(function (module) {

    var has = Object.prototype.hasOwnProperty
      , prefix = '~';

    /**
     * Constructor to create a storage for our `EE` objects.
     * An `Events` instance is a plain object whose properties are event names.
     *
     * @constructor
     * @private
     */
    function Events() {}

    //
    // We try to not inherit from `Object.prototype`. In some engines creating an
    // instance in this way is faster than calling `Object.create(null)` directly.
    // If `Object.create(null)` is not supported we prefix the event names with a
    // character to make sure that the built-in object properties are not
    // overridden or used as an attack vector.
    //
    if (Object.create) {
      Events.prototype = Object.create(null);

      //
      // This hack is needed because the `__proto__` property is still inherited in
      // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
      //
      if (!new Events().__proto__) prefix = false;
    }

    /**
     * Representation of a single event listener.
     *
     * @param {Function} fn The listener function.
     * @param {*} context The context to invoke the listener with.
     * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
     * @constructor
     * @private
     */
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }

    /**
     * Add a listener for a given event.
     *
     * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} context The context to invoke the listener with.
     * @param {Boolean} once Specify if the listener is a one-time listener.
     * @returns {EventEmitter}
     * @private
     */
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== 'function') {
        throw new TypeError('The listener must be a function');
      }

      var listener = new EE(fn, context || emitter, once)
        , evt = prefix ? prefix + event : event;

      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];

      return emitter;
    }

    /**
     * Clear event by name.
     *
     * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
     * @param {(String|Symbol)} evt The Event name.
     * @private
     */
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }

    /**
     * Minimal `EventEmitter` interface that is molded against the Node.js
     * `EventEmitter` interface.
     *
     * @constructor
     * @public
     */
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }

    /**
     * Return an array listing the events for which the emitter has registered
     * listeners.
     *
     * @returns {Array}
     * @public
     */
    EventEmitter.prototype.eventNames = function eventNames() {
      var names = []
        , events
        , name;

      if (this._eventsCount === 0) return names;

      for (name in (events = this._events)) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }

      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }

      return names;
    };

    /**
     * Return the listeners registered for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Array} The registered listeners.
     * @public
     */
    EventEmitter.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event
        , handlers = this._events[evt];

      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];

      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }

      return ee;
    };

    /**
     * Return the number of listeners listening to a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Number} The number of listeners.
     * @public
     */
    EventEmitter.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event
        , listeners = this._events[evt];

      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };

    /**
     * Calls each of the listeners registered for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Boolean} `true` if the event had listeners, else `false`.
     * @public
     */
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;

      if (!this._events[evt]) return false;

      var listeners = this._events[evt]
        , len = arguments.length
        , args
        , i;

      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

        switch (len) {
          case 1: return listeners.fn.call(listeners.context), true;
          case 2: return listeners.fn.call(listeners.context, a1), true;
          case 3: return listeners.fn.call(listeners.context, a1, a2), true;
          case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }

        for (i = 1, args = new Array(len -1); i < len; i++) {
          args[i - 1] = arguments[i];
        }

        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length
          , j;

        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

          switch (len) {
            case 1: listeners[i].fn.call(listeners[i].context); break;
            case 2: listeners[i].fn.call(listeners[i].context, a1); break;
            case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
            case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
            default:
              if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
                args[j - 1] = arguments[j];
              }

              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }

      return true;
    };

    /**
     * Add a listener for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };

    /**
     * Add a one-time listener for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };

    /**
     * Remove the listeners of a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn Only remove the listeners that match this function.
     * @param {*} context Only remove the listeners that have this context.
     * @param {Boolean} once Only remove one-time listeners.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;

      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }

      var listeners = this._events[evt];

      if (listeners.fn) {
        if (
          listeners.fn === fn &&
          (!once || listeners.once) &&
          (!context || listeners.context === context)
        ) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (
            listeners[i].fn !== fn ||
            (once && !listeners[i].once) ||
            (context && listeners[i].context !== context)
          ) {
            events.push(listeners[i]);
          }
        }

        //
        // Reset the array, or remove it completely if we have no more listeners.
        //
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }

      return this;
    };

    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param {(String|Symbol)} [event] The event name.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;

      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }

      return this;
    };

    //
    // Alias methods names because people roll like that.
    //
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;

    //
    // Expose the prefix.
    //
    EventEmitter.prefixed = prefix;

    //
    // Allow `EventEmitter` to be imported as module namespace.
    //
    EventEmitter.EventEmitter = EventEmitter;

    //
    // Expose the module.
    //
    {
      module.exports = EventEmitter;
    }
    });

    var pFinally = (promise, onFinally) => {
    	onFinally = onFinally || (() => {});

    	return promise.then(
    		val => new Promise(resolve => {
    			resolve(onFinally());
    		}).then(() => val),
    		err => new Promise(resolve => {
    			resolve(onFinally());
    		}).then(() => {
    			throw err;
    		})
    	);
    };

    class TimeoutError extends Error {
    	constructor(message) {
    		super(message);
    		this.name = 'TimeoutError';
    	}
    }

    const pTimeout = (promise, milliseconds, fallback) => new Promise((resolve, reject) => {
    	if (typeof milliseconds !== 'number' || milliseconds < 0) {
    		throw new TypeError('Expected `milliseconds` to be a positive number');
    	}

    	if (milliseconds === Infinity) {
    		resolve(promise);
    		return;
    	}

    	const timer = setTimeout(() => {
    		if (typeof fallback === 'function') {
    			try {
    				resolve(fallback());
    			} catch (error) {
    				reject(error);
    			}

    			return;
    		}

    		const message = typeof fallback === 'string' ? fallback : `Promise timed out after ${milliseconds} milliseconds`;
    		const timeoutError = fallback instanceof Error ? fallback : new TimeoutError(message);

    		if (typeof promise.cancel === 'function') {
    			promise.cancel();
    		}

    		reject(timeoutError);
    	}, milliseconds);

    	// TODO: Use native `finally` keyword when targeting Node.js 10
    	pFinally(
    		// eslint-disable-next-line promise/prefer-await-to-then
    		promise.then(resolve, reject),
    		() => {
    			clearTimeout(timer);
    		}
    	);
    });

    var pTimeout_1 = pTimeout;
    // TODO: Remove this for the next major release
    var _default = pTimeout;

    var TimeoutError_1 = TimeoutError;
    pTimeout_1.default = _default;
    pTimeout_1.TimeoutError = TimeoutError_1;

    var lowerBound_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    // Port of lower_bound from http://en.cppreference.com/w/cpp/algorithm/lower_bound
    // Used to compute insertion index to keep queue sorted after insertion
    function lowerBound(array, value, comparator) {
        let first = 0;
        let count = array.length;
        while (count > 0) {
            const step = (count / 2) | 0;
            let it = first + step;
            if (comparator(array[it], value) <= 0) {
                first = ++it;
                count -= step + 1;
            }
            else {
                count = step;
            }
        }
        return first;
    }
    exports.default = lowerBound;
    });

    unwrapExports(lowerBound_1);

    var priorityQueue = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    class PriorityQueue {
        constructor() {
            Object.defineProperty(this, "_queue", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: []
            });
        }
        enqueue(run, options) {
            options = Object.assign({ priority: 0 }, options);
            const element = {
                priority: options.priority,
                run
            };
            if (this.size && this._queue[this.size - 1].priority >= options.priority) {
                this._queue.push(element);
                return;
            }
            const index = lowerBound_1.default(this._queue, element, (a, b) => b.priority - a.priority);
            this._queue.splice(index, 0, element);
        }
        dequeue() {
            const item = this._queue.shift();
            return item && item.run;
        }
        filter(options) {
            return this._queue.filter(element => element.priority === options.priority).map(element => element.run);
        }
        get size() {
            return this._queue.length;
        }
    }
    exports.default = PriorityQueue;
    });

    unwrapExports(priorityQueue);

    var dist = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });



    const empty = () => { };
    const timeoutError = new pTimeout_1.TimeoutError();
    /**
    Promise queue with concurrency control.
    */
    class PQueue extends eventemitter3 {
        constructor(options) {
            super();
            Object.defineProperty(this, "_carryoverConcurrencyCount", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_isIntervalIgnored", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_intervalCount", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: 0
            });
            Object.defineProperty(this, "_intervalCap", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_interval", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_intervalEnd", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: 0
            });
            Object.defineProperty(this, "_intervalId", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_timeoutId", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_queue", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_queueClass", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_pendingCount", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: 0
            });
            // The `!` is needed because of https://github.com/microsoft/TypeScript/issues/32194
            Object.defineProperty(this, "_concurrency", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_isPaused", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_resolveEmpty", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: empty
            });
            Object.defineProperty(this, "_resolveIdle", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: empty
            });
            Object.defineProperty(this, "_timeout", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            Object.defineProperty(this, "_throwOnTimeout", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: void 0
            });
            // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
            options = Object.assign({ carryoverConcurrencyCount: false, intervalCap: Infinity, interval: 0, concurrency: Infinity, autoStart: true, queueClass: priorityQueue.default }, options
            // TODO: Remove this `as`.
            );
            if (!(typeof options.intervalCap === 'number' && options.intervalCap >= 1)) {
                throw new TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${options.intervalCap}\` (${typeof options.intervalCap})`);
            }
            if (options.interval === undefined || !(Number.isFinite(options.interval) && options.interval >= 0)) {
                throw new TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${options.interval}\` (${typeof options.interval})`);
            }
            this._carryoverConcurrencyCount = options.carryoverConcurrencyCount;
            this._isIntervalIgnored = options.intervalCap === Infinity || options.interval === 0;
            this._intervalCap = options.intervalCap;
            this._interval = options.interval;
            this._queue = new options.queueClass();
            this._queueClass = options.queueClass;
            this.concurrency = options.concurrency;
            this._timeout = options.timeout;
            this._throwOnTimeout = options.throwOnTimeout === true;
            this._isPaused = options.autoStart === false;
        }
        get _doesIntervalAllowAnother() {
            return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
        }
        get _doesConcurrentAllowAnother() {
            return this._pendingCount < this._concurrency;
        }
        _next() {
            this._pendingCount--;
            this._tryToStartAnother();
        }
        _resolvePromises() {
            this._resolveEmpty();
            this._resolveEmpty = empty;
            if (this._pendingCount === 0) {
                this._resolveIdle();
                this._resolveIdle = empty;
            }
        }
        _onResumeInterval() {
            this._onInterval();
            this._initializeIntervalIfNeeded();
            this._timeoutId = undefined;
        }
        _isIntervalPaused() {
            const now = Date.now();
            if (this._intervalId === undefined) {
                const delay = this._intervalEnd - now;
                if (delay < 0) {
                    // Act as the interval was done
                    // We don't need to resume it here because it will be resumed on line 160
                    this._intervalCount = (this._carryoverConcurrencyCount) ? this._pendingCount : 0;
                }
                else {
                    // Act as the interval is pending
                    if (this._timeoutId === undefined) {
                        this._timeoutId = setTimeout(() => {
                            this._onResumeInterval();
                        }, delay);
                    }
                    return true;
                }
            }
            return false;
        }
        _tryToStartAnother() {
            if (this._queue.size === 0) {
                // We can clear the interval ("pause")
                // Because we can redo it later ("resume")
                if (this._intervalId) {
                    clearInterval(this._intervalId);
                }
                this._intervalId = undefined;
                this._resolvePromises();
                return false;
            }
            if (!this._isPaused) {
                const canInitializeInterval = !this._isIntervalPaused();
                if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                    this.emit('active');
                    this._queue.dequeue()();
                    if (canInitializeInterval) {
                        this._initializeIntervalIfNeeded();
                    }
                    return true;
                }
            }
            return false;
        }
        _initializeIntervalIfNeeded() {
            if (this._isIntervalIgnored || this._intervalId !== undefined) {
                return;
            }
            this._intervalId = setInterval(() => {
                this._onInterval();
            }, this._interval);
            this._intervalEnd = Date.now() + this._interval;
        }
        _onInterval() {
            if (this._intervalCount === 0 && this._pendingCount === 0 && this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = undefined;
            }
            this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
            this._processQueue();
        }
        /**
        Executes all queued functions until it reaches the limit.
        */
        _processQueue() {
            // eslint-disable-next-line no-empty
            while (this._tryToStartAnother()) { }
        }
        get concurrency() {
            return this._concurrency;
        }
        set concurrency(newConcurrency) {
            if (!(typeof newConcurrency === 'number' && newConcurrency >= 1)) {
                throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${newConcurrency}\` (${typeof newConcurrency})`);
            }
            this._concurrency = newConcurrency;
            this._processQueue();
        }
        /**
        Adds a sync or async task to the queue. Always returns a promise.
        */
        async add(fn, options = {}) {
            return new Promise((resolve, reject) => {
                const run = async () => {
                    this._pendingCount++;
                    this._intervalCount++;
                    try {
                        const operation = (this._timeout === undefined && options.timeout === undefined) ? fn() : pTimeout_1.default(Promise.resolve(fn()), (options.timeout === undefined ? this._timeout : options.timeout), () => {
                            if (options.throwOnTimeout === undefined ? this._throwOnTimeout : options.throwOnTimeout) {
                                reject(timeoutError);
                            }
                            return undefined;
                        });
                        resolve(await operation);
                    }
                    catch (error) {
                        reject(error);
                    }
                    this._next();
                };
                this._queue.enqueue(run, options);
                this._tryToStartAnother();
            });
        }
        /**
        Same as `.add()`, but accepts an array of sync or async functions.

        @returns A promise that resolves when all functions are resolved.
        */
        async addAll(functions, options) {
            return Promise.all(functions.map(async (function_) => this.add(function_, options)));
        }
        /**
        Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)
        */
        start() {
            if (!this._isPaused) {
                return this;
            }
            this._isPaused = false;
            this._processQueue();
            return this;
        }
        /**
        Put queue execution on hold.
        */
        pause() {
            this._isPaused = true;
        }
        /**
        Clear the queue.
        */
        clear() {
            this._queue = new this._queueClass();
        }
        /**
        Can be called multiple times. Useful if you for example add additional items at a later time.

        @returns A promise that settles when the queue becomes empty.
        */
        async onEmpty() {
            // Instantly resolve if the queue is empty
            if (this._queue.size === 0) {
                return;
            }
            return new Promise(resolve => {
                const existingResolve = this._resolveEmpty;
                this._resolveEmpty = () => {
                    existingResolve();
                    resolve();
                };
            });
        }
        /**
        The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.

        @returns A promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.
        */
        async onIdle() {
            // Instantly resolve if none pending and if nothing else is queued
            if (this._pendingCount === 0 && this._queue.size === 0) {
                return;
            }
            return new Promise(resolve => {
                const existingResolve = this._resolveIdle;
                this._resolveIdle = () => {
                    existingResolve();
                    resolve();
                };
            });
        }
        /**
        Size of the queue.
        */
        get size() {
            return this._queue.size;
        }
        /**
        Size of the queue, filtered by the given options.

        For example, this can be used to find the number of items remaining in the queue with a specific priority level.
        */
        sizeBy(options) {
            return this._queue.filter(options).length;
        }
        /**
        Number of pending promises.
        */
        get pending() {
            return this._pendingCount;
        }
        /**
        Whether the queue is currently paused.
        */
        get isPaused() {
            return this._isPaused;
        }
        /**
        Set the timeout for future operations.
        */
        set timeout(milliseconds) {
            this._timeout = milliseconds;
        }
        get timeout() {
            return this._timeout;
        }
    }
    exports.default = PQueue;
    });

    var Q = unwrapExports(dist);

    class Datastore {
        constructor(options) {
            this.ref = "db";
            this.timestampData = false;
            // rename to something denotes that it's an internal thing
            this.q = new Q({
                concurrency: 1,
                autoStart: false,
            });
            this.indexes = {
                _id: new Index({ fieldName: "_id", unique: true }),
            };
            this.ttlIndexes = {};
            this.model = options.model || BaseModel;
            if (options.ref) {
                this.ref = options.ref;
            }
            const PersistenceAdapter = options.persistence_adapter || Persistence;
            // Persistence handling
            this.persistence = new PersistenceAdapter({
                db: this,
                model: options.model,
                afterSerialization: options.afterSerialization,
                beforeDeserialization: options.beforeDeserialization,
                corruptAlertThreshold: options.corruptAlertThreshold || 0,
            });
            if (options.timestampData) {
                this.timestampData = true;
            }
        }
        /**
         * Load the database from the datafile, and trigger the execution of buffered commands if any
         */
        loadDatabase() {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.persistence.loadDatabase();
            });
        }
        /**
         * Get an array of all the data in the database
         */
        getAllData() {
            return this.indexes._id.getAll();
        }
        /**
         * Reset all currently defined indexes
         */
        resetIndexes() {
            Object.keys(this.indexes).forEach((i) => {
                this.indexes[i].reset();
            });
        }
        /**
         * Ensure an index is kept for this field. Same parameters as lib/indexes
         * For now this function is synchronous, we need to test how much time it takes
         * We use an async API for consistency with the rest of the code
         */
        ensureIndex(options) {
            return __awaiter(this, void 0, void 0, function* () {
                options = options || {};
                if (!options.fieldName) {
                    let err = new Error("Cannot create an index without a fieldName");
                    err.missingFieldName = true;
                    throw err;
                }
                if (this.indexes[options.fieldName]) {
                    return { affectedIndex: options.fieldName };
                }
                this.indexes[options.fieldName] = new Index(options);
                // TTL
                if (options.expireAfterSeconds !== undefined) {
                    this.ttlIndexes[options.fieldName] = options.expireAfterSeconds;
                }
                // Index data
                try {
                    this.indexes[options.fieldName].insert(this.getAllData());
                }
                catch (e) {
                    delete this.indexes[options.fieldName];
                    throw e;
                }
                // We may want to force all options to be persisted including defaults, not just the ones passed the index creation function
                yield this.persistence.persistByAppendNewIndex([
                    { $$indexCreated: options },
                ]);
                return {
                    affectedIndex: options.fieldName,
                };
            });
        }
        /**
         * Remove an index
         */
        removeIndex(fieldName) {
            return __awaiter(this, void 0, void 0, function* () {
                delete this.indexes[fieldName];
                yield this.persistence.persistByAppendNewIndex([
                    { $$indexRemoved: fieldName },
                ]);
                return {
                    affectedIndex: fieldName,
                };
            });
        }
        /**
         * Add one or several document(s) to all indexes
         */
        addToIndexes(doc) {
            let failingIndex = -1;
            let error;
            const keys = Object.keys(this.indexes);
            for (let i = 0; i < keys.length; i++) {
                try {
                    this.indexes[keys[i]].insert(doc);
                }
                catch (e) {
                    failingIndex = i;
                    error = e;
                    break;
                }
            }
            // If an error happened, we need to rollback the insert on all other indexes
            if (error) {
                for (let i = 0; i < failingIndex; i++) {
                    this.indexes[keys[i]].remove(doc);
                }
                throw error;
            }
        }
        /**
         * Remove one or several document(s) from all indexes
         */
        removeFromIndexes(doc) {
            Object.keys(this.indexes).forEach((i) => {
                this.indexes[i].remove(doc);
            });
        }
        updateIndexes(oldDoc, newDoc) {
            let failingIndex = -1;
            let error;
            const keys = Object.keys(this.indexes);
            for (let i = 0; i < keys.length; i++) {
                try {
                    this.indexes[keys[i]].update(oldDoc, newDoc);
                }
                catch (e) {
                    failingIndex = i;
                    error = e;
                    break;
                }
            }
            // If an error happened, we need to rollback the update on all other indexes
            if (error) {
                for (let i = 0; i < failingIndex; i++) {
                    this.indexes[keys[i]].revertUpdate(oldDoc, newDoc);
                }
                throw error;
            }
        }
        _isBasicType(value) {
            return (typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean" ||
                value instanceof Date ||
                value === null);
        }
        /**
         * This will return the least number of candidates,
         * using Index if possible
         * when failing it will return all the database
         */
        _leastCandidates(query) {
            const currentIndexKeys = Object.keys(this.indexes);
            const queryKeys = Object.keys(query);
            let usableQueryKeys = [];
            // possibility: basic match
            queryKeys.forEach((k) => {
                // only types that can't be used with . notation
                if (this._isBasicType(query[k]) &&
                    currentIndexKeys.indexOf(k) !== -1) {
                    usableQueryKeys.push(k);
                }
            });
            if (usableQueryKeys.length > 0) {
                return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]);
            }
            // possibility: using $eq
            queryKeys.forEach((k) => {
                if (query[k] &&
                    query[k].hasOwnProperty("$eq") &&
                    this._isBasicType(query[k].$eq) &&
                    currentIndexKeys.indexOf(k) !== -1) {
                    usableQueryKeys.push(k);
                }
            });
            if (usableQueryKeys.length > 0) {
                return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$eq);
            }
            // possibility: using $in
            queryKeys.forEach((k) => {
                if (query[k] &&
                    query[k].hasOwnProperty("$in") &&
                    currentIndexKeys.indexOf(k) !== -1) {
                    usableQueryKeys.push(k);
                }
            });
            if (usableQueryKeys.length > 0) {
                return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$in);
            }
            // possibility: using $lt $lte $gt $gte
            queryKeys.forEach((k) => {
                if (query[k] &&
                    currentIndexKeys.indexOf(k) !== -1 &&
                    (query[k].hasOwnProperty("$lt") ||
                        query[k].hasOwnProperty("$lte") ||
                        query[k].hasOwnProperty("$gt") ||
                        query[k].hasOwnProperty("$gte"))) {
                    usableQueryKeys.push(k);
                }
            });
            if (usableQueryKeys.length > 0) {
                return this.indexes[usableQueryKeys[0]].getBetweenBounds(query[usableQueryKeys[0]]);
            }
            return this.getAllData();
        }
        /**
         * Return the list of candidates for a given query
         * Crude implementation for now, we return the candidates given by the first usable index if any
         * We try the following query types, in this order: basic match, $in match, comparison match
         * One way to make it better would be to enable the use of multiple indexes if the first usable index
         * returns too much data. I may do it in the future.
         *
         * Returned candidates will be scanned to find and remove all expired documents
         */
        getCandidates(query, dontExpireStaleDocs) {
            return __awaiter(this, void 0, void 0, function* () {
                const candidates = this._leastCandidates(query);
                if (dontExpireStaleDocs) {
                    return candidates;
                }
                const expiredDocsIds = [];
                const validDocs = [];
                const ttlIndexesFieldNames = Object.keys(this.ttlIndexes);
                candidates.forEach((candidate) => {
                    let valid = true;
                    ttlIndexesFieldNames.forEach((field) => {
                        if (candidate[field] !== undefined &&
                            candidate[field] instanceof Date &&
                            Date.now() >
                                candidate[field].getTime() +
                                    this.ttlIndexes[field] * 1000) {
                            valid = false;
                        }
                    });
                    if (valid) {
                        validDocs.push(candidate);
                    }
                    else if (candidate._id) {
                        expiredDocsIds.push(candidate._id);
                    }
                });
                for (let index = 0; index < expiredDocsIds.length; index++) {
                    const _id = expiredDocsIds[index];
                    yield this._remove({ _id }, { multi: false });
                }
                return validDocs;
            });
        }
        /**
         * Insert a new document
         */
        _insert(newDoc) {
            return __awaiter(this, void 0, void 0, function* () {
                let preparedDoc = this.prepareDocumentForInsertion(newDoc);
                this._insertInCache(preparedDoc);
                yield this.persistence.persistByAppendNewData(Array.isArray(preparedDoc) ? preparedDoc : [preparedDoc]);
                return deepCopy(preparedDoc, this.model);
            });
        }
        /**
         * Create a new _id that's not already in use
         */
        createNewId() {
            let tentativeId = uid();
            if (this.indexes._id.getMatching(tentativeId).length > 0) {
                tentativeId = this.createNewId();
            }
            return tentativeId;
        }
        /**
         * Prepare a document (or array of documents) to be inserted in a database
         * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
         */
        prepareDocumentForInsertion(newDoc) {
            let preparedDoc = [];
            if (Array.isArray(newDoc)) {
                newDoc.forEach((doc) => {
                    preparedDoc.push(this.prepareDocumentForInsertion(doc));
                });
            }
            else {
                preparedDoc = deepCopy(newDoc, this.model);
                if (preparedDoc._id === undefined) {
                    preparedDoc._id = this.createNewId();
                }
                const now = new Date();
                if (this.timestampData && preparedDoc.createdAt === undefined) {
                    preparedDoc.createdAt = now;
                }
                if (this.timestampData && preparedDoc.updatedAt === undefined) {
                    preparedDoc.updatedAt = now;
                }
                checkObject(preparedDoc);
            }
            return preparedDoc;
        }
        /**
         * If newDoc is an array of documents, this will insert all documents in the cache
         */
        _insertInCache(preparedDoc) {
            if (Array.isArray(preparedDoc)) {
                this._insertMultipleDocsInCache(preparedDoc);
            }
            else {
                this.addToIndexes(preparedDoc);
            }
        }
        /**
         * If one insertion fails (e.g. because of a unique constraint), roll back all previous
         * inserts and throws the error
         */
        _insertMultipleDocsInCache(preparedDocs) {
            let failingI = -1;
            let error;
            for (let i = 0; i < preparedDocs.length; i++) {
                try {
                    this.addToIndexes(preparedDocs[i]);
                }
                catch (e) {
                    error = e;
                    failingI = i;
                    break;
                }
            }
            if (error) {
                for (let i = 0; i < failingI; i++) {
                    this.removeFromIndexes(preparedDocs[i]);
                }
                throw error;
            }
        }
        insert(newDoc) {
            return __awaiter(this, void 0, void 0, function* () {
                const res = yield this.q.add(() => this._insert(newDoc));
                if (Array.isArray(res)) {
                    return {
                        docs: res,
                        number: res.length,
                    };
                }
                else {
                    return {
                        docs: [res],
                        number: 1,
                    };
                }
            });
        }
        /**
         * Count all documents matching the query
         */
        count(query) {
            return __awaiter(this, void 0, void 0, function* () {
                const cursor = new Cursor(this, query);
                return (yield cursor.exec()).length;
            });
        }
        /**
         * Find all documents matching the query
         */
        find(query) {
            return __awaiter(this, void 0, void 0, function* () {
                const cursor = new Cursor(this, query);
                const docs = yield cursor.exec();
                return docs;
            });
        }
        /**
         * Find all documents matching the query
         */
        cursor(query) {
            const cursor = new Cursor(this, query);
            return cursor;
        }
        /**
         * Update all docs matching query
         */
        _update(query, updateQuery, options) {
            return __awaiter(this, void 0, void 0, function* () {
                let multi = options.multi !== undefined ? options.multi : false;
                let upsert = options.upsert !== undefined ? options.upsert : false;
                const cursor = new Cursor(this, query);
                cursor.limit(1);
                const res = yield cursor.__exec_unsafe();
                if (res.length > 0) {
                    let numReplaced = 0;
                    const candidates = yield this.getCandidates(query);
                    const modifications = [];
                    // Preparing update (if an error is thrown here neither the datafile nor
                    // the in-memory indexes are affected)
                    for (let i = 0; i < candidates.length; i++) {
                        if ((multi || numReplaced === 0) &&
                            match(candidates[i], query)) {
                            numReplaced++;
                            let createdAt = candidates[i].createdAt;
                            let modifiedDoc = modify(candidates[i], updateQuery, this.model);
                            if (createdAt) {
                                modifiedDoc.createdAt = createdAt;
                            }
                            if (this.timestampData &&
                                updateQuery.updatedAt === undefined &&
                                (!updateQuery.$set ||
                                    updateQuery.$set.updatedAt === undefined)) {
                                modifiedDoc.updatedAt = new Date();
                            }
                            modifications.push({
                                oldDoc: candidates[i],
                                newDoc: modifiedDoc,
                            });
                        }
                    }
                    // Change the docs in memory
                    this.updateIndexes(modifications);
                    // Update the datafile
                    const updatedDocs = modifications.map((x) => x.newDoc);
                    yield this.persistence.persistByAppendNewData(updatedDocs);
                    return {
                        number: updatedDocs.length,
                        docs: updatedDocs.map((x) => deepCopy(x, this.model)),
                        upsert: false,
                    };
                }
                else if (res.length === 0 && upsert) {
                    if (!updateQuery.$setOnInsert) {
                        throw new Error("$setOnInsert modifier is required when upserting");
                    }
                    let toBeInserted = deepCopy(updateQuery.$setOnInsert, this.model, true);
                    const newDoc = yield this._insert(toBeInserted);
                    if (Array.isArray(newDoc)) {
                        return {
                            number: newDoc.length,
                            docs: newDoc,
                            upsert: true,
                        };
                    }
                    else {
                        return {
                            number: 1,
                            docs: [newDoc],
                            upsert: true,
                        };
                    }
                }
                else {
                    return {
                        number: 0,
                        docs: [],
                        upsert: false,
                    };
                }
            });
        }
        update(query, updateQuery, options) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield this.q.add(() => this._update(query, updateQuery, options));
            });
        }
        /**
         * Remove all docs matching the query
         * For now very naive implementation (similar to update)
         */
        _remove(query, options) {
            return __awaiter(this, void 0, void 0, function* () {
                let numRemoved = 0;
                const removedDocs = [];
                const removedFullDoc = [];
                let multi = options ? !!options.multi : false;
                const candidates = yield this.getCandidates(query, true);
                candidates.forEach((d) => {
                    if (match(d, query) && (multi || numRemoved === 0)) {
                        numRemoved++;
                        removedFullDoc.push(deepCopy(d, this.model));
                        removedDocs.push({ $$deleted: true, _id: d._id });
                        this.removeFromIndexes(d);
                    }
                });
                yield this.persistence.persistByAppendNewData(removedDocs);
                return {
                    number: numRemoved,
                    docs: removedFullDoc,
                };
            });
        }
        remove(query, options) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.q.add(() => this._remove(query, options));
            });
        }
    }

    class Database {
        constructor(options) {
            this.reloadBeforeOperations = false;
            /**
             * Put one document
             */
            this.create = this.insert;
            /**
             * Find documents that meets a specified criteria
             */
            this.find = this.read;
            this.model =
                options.model ||
                    BaseModel;
            if (options.ref.startsWith("dina://")) {
                // using an external instance
                this.ref = options.ref.substr(7);
                this.loaded = new Promise(() => true);
                return;
            }
            this.ref = options.ref;
            this.reloadBeforeOperations = !!options.reloadBeforeOperations;
            this._datastore = new Datastore({
                ref: this.ref,
                model: this.model,
                afterSerialization: options.afterSerialization,
                beforeDeserialization: options.beforeDeserialization,
                corruptAlertThreshold: options.corruptAlertThreshold,
                persistence_adapter: options.persistence_adapter,
                timestampData: options.timestampData,
            });
            this.loaded = this._datastore.loadDatabase();
            if (options.autoCompaction && options.autoCompaction > 0) {
                this._datastore.persistence.setAutocompactionInterval(options.autoCompaction);
            }
        }
        reloadFirst() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.reloadBeforeOperations)
                    return;
                yield this.reload();
            });
        }
        /**
         * insert documents
         */
        insert(docs) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("insert", docs);
                }
                yield this.reloadFirst();
                const res = yield this._datastore.insert(docs);
                return res;
            });
        }
        /**
         * Find document(s) that meets a specified criteria
         */
        read({ filter, skip, limit, project, sort = undefined, }) {
            return __awaiter(this, void 0, void 0, function* () {
                filter = fixDeep(filter || {});
                sort = fixDeep(sort || {});
                project = fixDeep(project || {});
                if (!this._datastore) {
                    return this._externalCall("read", {
                        filter,
                        skip,
                        limit,
                        project,
                        sort,
                    });
                }
                const cursor = this._datastore.cursor(filter);
                if (sort) {
                    cursor.sort(sort);
                }
                if (skip) {
                    cursor.skip(skip);
                }
                if (limit) {
                    cursor.limit(limit);
                }
                if (project) {
                    cursor.projection(project);
                }
                yield this.reloadFirst();
                return yield cursor.exec();
            });
        }
        /**
         * Update document(s) that meets the specified criteria
         */
        update({ filter, update, multi, }) {
            return __awaiter(this, void 0, void 0, function* () {
                filter = fixDeep(filter || {});
                if (update.$set) {
                    update.$set = fixDeep(update.$set);
                }
                if (update.$unset) {
                    update.$unset = fixDeep(update.$unset);
                }
                if (!this._datastore) {
                    return this._externalCall("update", { filter, update, multi });
                }
                yield this.reloadFirst();
                const res = yield this._datastore.update(filter, update, {
                    multi,
                    upsert: false,
                });
                return res;
            });
        }
        /**
         * Update document(s) that meets the specified criteria,
         * and do an insertion if no documents are matched
         */
        upsert({ filter, update, multi, }) {
            return __awaiter(this, void 0, void 0, function* () {
                filter = fixDeep(filter || {});
                if (update.$set) {
                    update.$set = fixDeep(update.$set);
                }
                if (update.$unset) {
                    update.$unset = fixDeep(update.$unset);
                }
                if (!this._datastore) {
                    return this._externalCall("upsert", { filter, update, multi });
                }
                yield this.reloadFirst();
                const res = yield this._datastore.update(filter, update, {
                    multi,
                    upsert: true,
                });
                return res;
            });
        }
        /**
         * Count documents that meets the specified criteria
         */
        count(filter = {}) {
            return __awaiter(this, void 0, void 0, function* () {
                filter = fixDeep(filter || {});
                if (!this._datastore) {
                    return this._externalCall("count", filter);
                }
                yield this.reloadFirst();
                return yield this._datastore.count(filter);
            });
        }
        /**
         * Delete document(s) that meets the specified criteria
         *
         */
        delete({ filter, multi, }) {
            return __awaiter(this, void 0, void 0, function* () {
                filter = fixDeep(filter || {});
                if (!this._datastore) {
                    return this._externalCall("delete", { filter, multi });
                }
                yield this.reloadFirst();
                const res = yield this._datastore.remove(filter, {
                    multi: multi || false,
                });
                return res;
            });
        }
        /**
         * Create an index specified by options
         */
        createIndex(options) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("createIndex", options);
                }
                yield this.reloadFirst();
                return yield this._datastore.ensureIndex(options);
            });
        }
        /**
         * Remove an index by passing the field name that it is related to
         */
        removeIndex(fieldName) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("removeIndex", { fieldName });
                }
                yield this.reloadFirst();
                return yield this._datastore.removeIndex(fieldName);
            });
        }
        /**
         * Reload database from the persistence layer (if it exists)
         */
        reload() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("reload", {});
                }
                yield this._datastore.persistence.loadDatabase();
                return {};
            });
        }
        /**
         * Compact the database persistence layer
         */
        compact() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("compact", {});
                }
                yield this._datastore.persistence.compactDatafile();
                return {};
            });
        }
        /**
         * forcefully unlocks the persistence layer
         * use with caution, and only if you know what you're doing
         */
        forcefulUnlock() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("forcefulUnlock", {});
                }
                yield this._datastore.persistence.forcefulUnlock();
                return {};
            });
        }
        /**
         * Stop auto compaction of the persistence layer
         */
        stopAutoCompaction() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("stopAutoCompaction", {});
                }
                this._datastore.persistence.stopAutocompaction();
                return {};
            });
        }
        /**
         * Set auto compaction defined by an an interval
         */
        resetAutoCompaction(interval) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._datastore) {
                    return this._externalCall("resetAutoCompaction", { interval });
                }
                this._datastore.persistence.setAutocompactionInterval(interval);
                return {};
            });
        }
        _externalCall(operation, body) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(`${this.ref}/${operation}`, {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });
                let data = yield response.json();
                if (Array.isArray(data) && data[0] && data[0]._id) {
                    data = data.map((x) => this.model.new(x));
                }
                if (Array.isArray(data.docs) && data.docs[0] && data.docs[0]._id) {
                    data.docs = data.docs.map((x) => this.model.new(x));
                }
                return data;
            });
        }
    }
    function fixDeep(input) {
        const result = Object.assign(input, input.$deep);
        delete result.$deep;
        return result;
    }

    class Store {
        constructor(dbName = 'keyval-store', storeName = 'keyval') {
            this.storeName = storeName;
            this._dbp = new Promise((resolve, reject) => {
                const openreq = indexedDB.open(dbName, 1);
                openreq.onerror = () => reject(openreq.error);
                openreq.onsuccess = () => resolve(openreq.result);
                // First time setup: create an empty object store
                openreq.onupgradeneeded = () => {
                    openreq.result.createObjectStore(storeName);
                };
            });
        }
        _withIDBStore(type, callback) {
            return this._dbp.then(db => new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, type);
                transaction.oncomplete = () => resolve();
                transaction.onabort = transaction.onerror = () => reject(transaction.error);
                callback(transaction.objectStore(this.storeName));
            }));
        }
    }
    let store;
    function getDefaultStore() {
        if (!store)
            store = new Store();
        return store;
    }
    function get(key, store = getDefaultStore()) {
        let req;
        return store._withIDBStore('readonly', store => {
            req = store.get(key);
        }).then(() => req.result);
    }
    function set(key, value, store = getDefaultStore()) {
        return store._withIDBStore('readwrite', store => {
            store.put(value, key);
        });
    }
    function del(key, store = getDefaultStore()) {
        return store._withIDBStore('readwrite', store => {
            store.delete(key);
        });
    }
    function keys(store = getDefaultStore()) {
        const keys = [];
        return store._withIDBStore('readonly', store => {
            // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
            // And openKeyCursor isn't supported by Safari.
            (store.openKeyCursor || store.openCursor).call(store).onsuccess = function () {
                if (!this.result)
                    return;
                keys.push(this.result.key);
                this.result.continue();
            };
        }).then(() => keys);
    }

    const databases = {};
    function hash(input) {
        var hash = 0;
        for (let i = 0; i < input.length; i++) {
            let chr = input.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0;
        }
        return hash.toString();
    }
    class IDB_Persistence_Adapter extends Persistence {
        init() {
            return __awaiter(this, void 0, void 0, function* () {
                databases["data"] = new Store(this.ref, "data");
                databases["indexes"] = new Store(this.ref, "indexes");
            });
        }
        readIndexes(event) {
            return __awaiter(this, void 0, void 0, function* () {
                const keys$1 = yield keys(databases["indexes"]);
                for (let i = 0; i < keys$1.length; i++) {
                    const key = keys$1[i];
                    const line = yield get(key, databases["indexes"]);
                    event.emit("readLine", line);
                }
                event.emit("end", "");
            });
        }
        readData(event) {
            return __awaiter(this, void 0, void 0, function* () {
                const keys$1 = yield keys(databases["data"]);
                for (let i = 0; i < keys$1.length; i++) {
                    const key = keys$1[i];
                    const line = yield get(key, databases["data"]);
                    event.emit("readLine", line);
                }
                event.emit("end", "");
            });
        }
        rewriteIndexes(event) {
            return __awaiter(this, void 0, void 0, function* () {
                const keys$1 = yield keys(databases["indexes"]);
                for (let i = 0; i < keys$1.length; i++) {
                    const key = keys$1[i];
                    yield del(key, databases["indexes"]);
                }
                event.on("writeLine", (data) => __awaiter(this, void 0, void 0, function* () {
                    yield set(hash(data), data, databases["indexes"]);
                }));
            });
        }
        rewriteData(event) {
            return __awaiter(this, void 0, void 0, function* () {
                const keys$1 = yield keys(databases["data"]);
                for (let i = 0; i < keys$1.length; i++) {
                    const key = keys$1[i];
                    yield del(key, databases["data"]);
                }
                event.on("writeLine", (data) => __awaiter(this, void 0, void 0, function* () {
                    yield set(hash(data), data, databases["data"]);
                }));
            });
        }
        appendIndex(data) {
            return __awaiter(this, void 0, void 0, function* () {
                yield set(hash(data), data, databases["indexes"]);
            });
        }
        appendData(data) {
            return __awaiter(this, void 0, void 0, function* () {
                yield set(hash(data), data, databases["indexes"]);
            });
        }
    }

    exports.BaseModel = BaseModel;
    exports.Database = Database;
    exports.IDB_Persistence_Adapter = IDB_Persistence_Adapter;

    Object.defineProperty(exports, '__esModule', { value: true });

})));

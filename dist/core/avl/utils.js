"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.defaultCompareKeysFunction = defaultCompareKeysFunction;
/**
 * Check whether two values are equal (used in non-unique deletion)
 */
function defaultCheckValueEquality(a, b) {
    return a === b;
}
exports.defaultCheckValueEquality = defaultCheckValueEquality;
function isDef(v) {
    return v !== undefined;
}
exports.isDef = isDef;

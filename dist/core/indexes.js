"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const avl_1 = require("./avl");
const model = require("./model");
const util = require("util");
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
            compareKeys: model.compareThings,
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
        this.tree = new avl_1.AVLTree(this.treeOptions);
    }
    reset(newData) {
        this.tree = new avl_1.AVLTree(this.treeOptions);
        if (newData) {
            this.insert(newData);
        }
    }
    /**
     * Insert a new document in the index
     * If an array is passed, we insert all its elements (if one insertion fails the index is not modified)
     * O(log(n))
     */
    insert(doc) {
        if (util.isArray(doc)) {
            this.insertMultipleDocs(doc);
            return;
        }
        let key = model.getDotValue(doc, this.fieldName);
        // We don't index documents that don't contain the field if the index is sparse
        if (key === undefined && this.sparse) {
            return;
        }
        if (!util.isArray(key)) {
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
        if (util.isArray(doc)) {
            doc.forEach((d) => this.remove(d));
            return;
        }
        let key = model.getDotValue(doc, this.fieldName);
        if (key === undefined && this.sparse) {
            return;
        }
        if (!util.isArray(key)) {
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
        if (util.isArray(oldDoc)) {
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
        // convert all util.isArray to Array.isArray
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
        if (!util.isArray(key)) {
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
exports.Index = Index;

import { BSTOptions } from "./types";
import * as utils from "./utils";
/**
 * Simple binary search tree
 */
export declare class BST<K, V> {
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

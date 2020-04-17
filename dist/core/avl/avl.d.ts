import { BST } from "./bst";
import { AVLOptions } from "./types";
import * as utils from "./utils";
/**
 * Self-balancing binary search tree using the AVL implementation
 */
export declare class AVLTree<K, V> {
    tree: Node<K, V>;
    constructor(options?: AVLOptions<K, V>);
    checkIsAVLT(): void;
    insert(key: K, value: V): void;
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
}
/**
 * Node
 */
export declare class Node<K, V> extends BST<K, V> {
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

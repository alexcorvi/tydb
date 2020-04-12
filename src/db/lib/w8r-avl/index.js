"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
/**
 * Default comparison function
 */
function DEFAULT_COMPARE(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
}
/**
 * Single left rotation
 */
function rotateLeft(node) {
    const rightNode = node.right;
    if (!rightNode)
        return undefined;
    node.right = rightNode.left;
    if (rightNode.left)
        rightNode.left.parent = node;
    rightNode.parent = node.parent;
    if (rightNode.parent) {
        if (rightNode.parent.left === node) {
            rightNode.parent.left = rightNode;
        }
        else {
            rightNode.parent.right = rightNode;
        }
    }
    node.parent = rightNode;
    rightNode.left = node;
    node.balanceFactor += 1;
    if (rightNode.balanceFactor < 0) {
        node.balanceFactor -= rightNode.balanceFactor;
    }
    rightNode.balanceFactor += 1;
    if (node.balanceFactor > 0) {
        rightNode.balanceFactor += node.balanceFactor;
    }
    return rightNode;
}
function rotateRight(node) {
    const leftNode = node.left;
    if (!leftNode)
        return undefined;
    node.left = leftNode.right;
    if (node.left)
        node.left.parent = node;
    leftNode.parent = node.parent;
    if (leftNode.parent) {
        if (leftNode.parent.left === node) {
            leftNode.parent.left = leftNode;
        }
        else {
            leftNode.parent.right = leftNode;
        }
    }
    node.parent = leftNode;
    leftNode.right = node;
    node.balanceFactor -= 1;
    if (leftNode.balanceFactor > 0) {
        node.balanceFactor -= leftNode.balanceFactor;
    }
    leftNode.balanceFactor -= 1;
    if (node.balanceFactor < 0) {
        leftNode.balanceFactor += node.balanceFactor;
    }
    return leftNode;
}
class AVLTree {
    constructor(comparator, noDupes) {
        this._comparator = DEFAULT_COMPARE;
        this._root = undefined;
        this._size = 0;
        this._noDuplicates = false;
        if (typeof comparator !== "undefined") {
            this._comparator = comparator;
        }
        if (typeof noDupes !== "undefined") {
            this._noDuplicates = noDupes;
        }
    }
    /**
     * Clear the tree
     */
    destroy() {
        return this.clear();
    }
    /**
     * Clear the tree
     */
    clear() {
        this._root = undefined;
        this._size = 0;
        return this;
    }
    /**
     * Number of nodes
     */
    get size() {
        return this._size;
    }
    /**
     * Whether the tree contains a node with the given key
     */
    contains(key) {
        if (this._root) {
            let node = this._root;
            let comparator = this._comparator;
            while (node) {
                let cmp = comparator(key, node.key);
                if (cmp === 0)
                    return true;
                else if (cmp < 0) {
                    node = node.left;
                }
                else {
                    node = node.right;
                }
            }
        }
        return false;
    }
    /**
     * Successor node
     */
    next(node) {
        let successor = node;
        if (successor) {
            if (successor.right) {
                successor = successor.right;
                while (successor.left)
                    successor = successor.left;
            }
            else {
                successor = node.parent;
                while (successor && successor.right === node) {
                    node = successor;
                    successor = successor.parent;
                }
            }
        }
        return successor;
    }
    /**
     * Predecessor node
     */
    prev(node) {
        let predecessor = node;
        if (predecessor) {
            if (predecessor.left) {
                predecessor = predecessor.left;
                while (predecessor.right)
                    predecessor = predecessor.right;
            }
            else {
                predecessor = node.parent;
                while (predecessor && predecessor.left === node) {
                    node = predecessor;
                    predecessor = predecessor.parent;
                }
            }
        }
        return predecessor;
    }
    /**
     * Callback for forEach
     */
    forEach(callback) {
        let current = this._root;
        let s = [];
        let done = false;
        let i = 0;
        while (!done) {
            // Reach the left most Node of the current Node
            if (current) {
                // Place pointer to a tree node on the stack
                // before traversing the node's left subtree
                s.push(current);
                current = current.left;
            }
            else {
                // BackTrack from the empty subtree and visit the Node
                // at the top of the stack; however, if the stack is
                // empty you are done
                if (s.length > 0) {
                    current = s.pop();
                    callback(current, i++);
                    // We have visited the node and its left
                    // subtree. Now, it's right subtree's turn
                    if (current) {
                        current = current.right;
                    }
                }
                else
                    done = true;
            }
        }
        return this;
    }
    /**
     * Walk key range from `low` to `high`. Stops if `fn` returns a value.
     */
    range(low, high, fn, ctx) {
        const Q = [];
        const compare = this._comparator;
        let node = this._root;
        let cmp;
        while (Q.length !== 0 || node) {
            if (node) {
                Q.push(node);
                node = node.left;
            }
            else {
                node = Q.pop();
                if (!node)
                    return this;
                cmp = compare(node.key, high);
                if (cmp > 0) {
                    break;
                }
                else if (compare(node.key, low) >= 0) {
                    if (fn.call(ctx, node))
                        return this; // stop if smth is returned
                }
                if (node) {
                    node = node.right;
                }
            }
        }
        return this;
    }
    keys() {
        let current = this._root;
        const s = [], r = [];
        let done = false;
        while (!done) {
            if (current) {
                s.push(current);
                current = current.left;
            }
            else {
                if (s.length > 0) {
                    current = s.pop();
                    if (!current) {
                        return r;
                    }
                    r.push(current.key);
                    current = current.right;
                }
                else
                    done = true;
            }
        }
        return r;
    }
    values() {
        let current = this._root;
        const s = [], r = [];
        let done = false;
        while (!done) {
            if (current) {
                s.push(current);
                current = current.left;
            }
            else {
                if (s.length > 0) {
                    current = s.pop();
                    if (!current) {
                        return r;
                    }
                    r.push(current.data);
                    current = current.right;
                }
                else
                    done = true;
            }
        }
        return r;
    }
    /**
     * Returns node at given index
     */
    at(index) {
        // removed after a consideration, more misleading than useful
        // index = index % this.size;
        // if (index < 0) index = this.size - index;
        let current = this._root;
        let s = [], done = false, i = 0;
        while (!done) {
            if (current) {
                s.push(current);
                current = current.left;
            }
            else {
                if (s.length > 0) {
                    current = s.pop();
                    if (!current) {
                        return undefined;
                    }
                    if (i === index)
                        return current;
                    i++;
                    current = current.right;
                }
                else
                    done = true;
            }
        }
        return undefined;
    }
    /**
     * Returns node with the minimum key
     */
    minNode() {
        let node = this._root;
        if (!node)
            return undefined;
        while (node.left)
            node = node.left;
        return node;
    }
    /**
     * Returns node with the max key
     */
    maxNode() {
        let node = this._root;
        if (!node)
            return undefined;
        while (node.right)
            node = node.right;
        return node;
    }
    /**
     * Min key
     */
    min() {
        let node = this._root;
        if (!node)
            return undefined;
        while (node.left)
            node = node.left;
        return node.key;
    }
    /**
     * Max key
     */
    max() {
        let node = this._root;
        if (!node)
            return undefined;
        while (node.right)
            node = node.right;
        return node.key;
    }
    /**
     * is the tree empty?
     */
    isEmpty() {
        return !this._root;
    }
    /**
     * Removes and returns the node with smallest key
     */
    pop() {
        let node = this._root;
        let returnValue = undefined;
        if (node) {
            while (node.left)
                node = node.left;
            returnValue = { key: node.key, data: node.data };
            this.remove(node.key);
        }
        return returnValue;
    }
    /**
     * Removes and returns the node with highest key
     */
    popMax() {
        let node = this._root;
        let returnValue = undefined;
        if (node) {
            while (node.right)
                node = node.right;
            returnValue = { key: node.key, data: node.data };
            this.remove(node.key);
        }
        return returnValue;
    }
    /**
     * Find node by key
     */
    find(key) {
        let root = this._root;
        let subtree = root, cmp;
        let compare = this._comparator;
        while (subtree) {
            cmp = compare(key, subtree.key);
            if (cmp === 0)
                return subtree;
            else if (cmp < 0)
                subtree = subtree.left;
            else
                subtree = subtree.right;
        }
        return undefined;
    }
    /**
     * search
     */
    search(key) {
        let root = this._root;
        let subtree = root, cmp;
        let compare = this._comparator;
        let results = [];
        while (subtree) {
            cmp = compare(key, subtree.key);
            if (cmp === 0) {
                results.push(subtree);
                break;
            }
            if (cmp < 0)
                subtree = subtree.left;
            else
                subtree = subtree.right;
        }
        return results;
    }
    /**
     * Insert a node into the tree
     */
    insert(key, data) {
        if (!this._root) {
            this._root = {
                parent: undefined,
                left: undefined,
                right: undefined,
                balanceFactor: 0,
                key,
                data,
            };
            this._size++;
            return this._root;
        }
        const compare = this._comparator;
        let node = this._root;
        let parent = undefined;
        let cmp = 0;
        if (this._noDuplicates) {
            while (node) {
                cmp = compare(key, node.key);
                parent = node;
                if (cmp === 0) {
                    return undefined;
                }
                else if (cmp < 0) {
                    node = node.left;
                }
                else {
                    node = node.right;
                }
            }
        }
        else {
            while (node) {
                cmp = compare(key, node.key);
                parent = node;
                if (cmp <= 0)
                    node = node.left;
                else
                    node = node.right;
            }
        }
        let newNode = {
            left: undefined,
            right: undefined,
            balanceFactor: 0,
            parent,
            key,
            data,
        };
        let newRoot;
        if (cmp <= 0 && parent)
            parent.left = newNode;
        else if (parent)
            parent.right = newNode;
        while (parent) {
            cmp = compare(parent.key, key);
            if (cmp < 0)
                parent.balanceFactor -= 1;
            else
                parent.balanceFactor += 1;
            if (parent.balanceFactor === 0) {
                break;
            }
            else if (parent.balanceFactor < -1) {
                if (parent &&
                    parent.right &&
                    parent.right.balanceFactor === 1) {
                    rotateRight(parent.right);
                }
                newRoot = rotateLeft(parent);
                if (parent === this._root) {
                    this._root = newRoot;
                }
                break;
            }
            else if (parent.balanceFactor > 1) {
                if (parent && parent.left && parent.left.balanceFactor === -1) {
                    rotateLeft(parent.left);
                }
                newRoot = rotateRight(parent);
                if (parent === this._root) {
                    this._root = newRoot;
                }
                break;
            }
            parent = parent.parent;
        }
        this._size++;
        return newNode;
    }
    /**
     * Removes the node from the tree. If not found, returns undefined.
     */
    remove(key) {
        if (!this._root) {
            return undefined;
        }
        let node = this._root;
        let compare = this._comparator;
        let cmp = 0;
        while (node) {
            cmp = compare(key, node.key);
            if (cmp === 0)
                break;
            else if (cmp < 0)
                node = node.left;
            else
                node = node.right;
        }
        if (!node) {
            return undefined;
        }
        let returnValue = node.key;
        let max, min;
        if (node.left) {
            max = node.left;
            while (max.left || max.right) {
                while (max.right)
                    max = max.right;
                node.key = max.key;
                node.data = max.data;
                if (max.left) {
                    node = max;
                    max = max.left;
                }
            }
            node.key = max.key;
            node.data = max.data;
            node = max;
        }
        if (node.right) {
            min = node.right;
            while (min.left || min.right) {
                while (min.left)
                    min = min.left;
                node.key = min.key;
                node.data = min.data;
                if (min.right) {
                    node = min;
                    min = min.right;
                }
            }
            node.key = min.key;
            node.data = min.data;
            node = min;
        }
        let parent = node.parent;
        let pp = node;
        let newRoot;
        while (parent) {
            if (parent.left === pp)
                parent.balanceFactor -= 1;
            else
                parent.balanceFactor += 1;
            if (parent.balanceFactor < -1) {
                if (parent.right && parent.right.balanceFactor === 1) {
                    rotateRight(parent.right);
                }
                newRoot = rotateLeft(parent);
                if (parent === this._root) {
                    this._root = newRoot;
                }
                parent = newRoot;
            }
            else if (parent.balanceFactor > 1) {
                if (parent.left && parent.left.balanceFactor === -1) {
                    rotateLeft(parent.left);
                }
                newRoot = rotateRight(parent);
                if (parent === this._root) {
                    this._root = newRoot;
                }
                parent = newRoot;
            }
            if (parent &&
                (parent.balanceFactor === -1 || parent.balanceFactor === 1)) {
                break;
            }
            pp = parent;
            parent = parent ? parent.parent : undefined;
        }
        if (node.parent) {
            if (node.parent.left === node)
                node.parent.left = undefined;
            else
                node.parent.right = undefined;
        }
        if (node === this._root)
            this._root = undefined;
        this._size--;
        return returnValue;
    }
    /**
     * Bulk-load items
     */
    load(keys = [], values = [], presort) {
        if (this._size !== 0) {
            throw new Error("bulk-load: tree is not empty");
        }
        const size = keys.length;
        if (presort)
            utils_1.sort(keys, values, 0, size - 1, this._comparator);
        this._root = utils_1.loadRecursive(undefined, keys, values, 0, size);
        utils_1.markBalance(this._root);
        this._size = size;
        return this;
    }
    /**
     * Returns true if the tree is balanced
     */
    isBalanced() {
        return utils_1.isBalanced(this._root);
    }
    /**
     * String representation of the tree - primitive horizontal print-out
     */
    toString(printNode) {
        return utils_1.print(this._root, printNode);
    }
}
exports.default = AVLTree;

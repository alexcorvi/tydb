"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bst_1 = __importDefault(require("./bst"));
const utils = __importStar(require("./utils"));
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
exports.AVLTree = AVLTree;
/**
 * Node
 */
class Node extends bst_1.default {
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
        this.compareKeys = init.compareKeys || utils.defaultCompareKeysFunction;
        this.checkValueEquality =
            init.checkValueEquality || utils.defaultCheckValueEquality;
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
exports.Node = Node;
// for testing purposes
AVLTree._AVLTree = Node;

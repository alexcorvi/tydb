export type Node<Key = any, Value = any> = {
	parent?: Node<Key, Value>;
	left?: Node<Key, Value>;
	right?: Node<Key, Value>;
	balanceFactor: number;
	key: Key;
	data: Value;
};

export type Comparator<Key> = (a: Key, b: Key) => number;

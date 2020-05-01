---
description: How to use TyDB in the browser (with demo)
---

# In the Browser

## Installation and usage

#### Directly including TyDB in a script tag

```markup
<script src="//raw.githack.com/alexcorvi/tydb/master/dist/index.browser.js"></script>
```

#### Using a module bundler & package manager

Install TyDB using npm

```markup
npm i tydb
```

or using yarn

```markup
yarn i tydb
```

{% hint style="info" %}
If you're using a bundler with package manager, then you will have to tell your bundler that you're bundling your project for the browser \(if it doesn't defaults to that already\), so the bundler will use the file specified in `browser` field instead of `main` field.

* [Setting target in Webpack](https://webpack.js.org/concepts/targets/)
* [Setting target in Parcel](https://parceljs.org/cli.html#target)
* [Setting target in Rollup](https://github.com/rollup/plugins/tree/master/packages/node-resolve#browser)
{% endhint %}

## Memory only

Similar to when running in NodeJS, if you instantiate the database with no persistence adapter, data will not be persisted and will live in memory only.

```javascript
const db = new tydb.Database({
    ref: "mydb",
    model: MyModel
});
```

## Using IndexedDB Adapter

```javascript
const db = new tydb.Database({
    ref: "mydb",
    model: MyModel,
    persistence_adapter: tydb.IDB_Persistence_Adapter
});

```

[Demo in JSFiddle](https://jsfiddle.net/alexcorvi/gwq53jfm/31/)

## Connecting to a remote instance

```javascript
const db = new tydb.Database({
    ref: "nedb://http://example.com/mydb",
    model: MyModel,
});
```

Similar to when running in NodeJS environment, the instance in this case will be nothing more than a shell that sends arguments and receive data.


# TyDB

Strongly-typed, fast, light-weight, embedded, Mongo-like database with built-in ODM.

![TyDB](https://gblobscdn.gitbook.com/spaces%2F-M5x-OYpWMkttcJ8qdHj%2Favatar-1588014792765.png)

[Full Documentation](https://alex-corvi.gitbook.io/tydb/)

## Introduction

TyDB is a database system written in typescript, its goal is to provide a strongly-typed database experience with an API and a query language similar to MongoDB.

-   It can be in-memory, or persistent (using a persistence adapter).
-   It can be used with NodeJS or in the browser.
-   It can be embedded or served over a network (like MongoDB).
-   The query language and the API is very similar to MongoDB, (except for the dot notation) and the difference is only to provide and experience with maximum type declaration.
-   Persisted in a flat file when in node (using a persistence adapter), persisted in IndexedDB when in the browser (using another adapter), and you can easily write your own adapter too.
-   Can deal with large data sets (tested against 1GB of data) and won't take too much memory.
-   It is fast.
-   It is light-weight (45KB, not gzipped).

## Why?

As I was looking through embedded database systems for Nodejs, I found NeDB. however, it is not being maintained. Looking through the source code, I saw some low hanging fruits to improve it, pull requests have been submitted for years without being resolved. And this is how TyDB was conceived, under-the-hood, it is actually NeDB, but with major improvements, and here's a list of few of them:

-   Pluggable persistence layer using persistence adapter.
-   Supports all MongoDB operators.
-   Strongly typed data for all operations.
-   It can deal with large databases, unlike NeDB which had a hard limit of 256 MB.
-   Built-in ODM.
-   Multiple instances can connect on the same database.
-   Can be served over the network.

# generic-pool-prometheus-exporter

[![Build Status](https://travis-ci.org/hekike/generic-pool-prometheus-exporter.svg?branch=master)](https://travis-ci.org/hekike/generic-pool-prometheus-exporter)

Prometheus exporter for the [generic-pool](https://github.com/coopernurse/node-pool)
`npm` package that's used by [knex](https://www.npmjs.com/package/knex).

# API

## poolExporter

Create pool exporter

**Parameters**

-   `pool` **Pool**  generic-pool instance
-   `opts` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?** options
    -   `opts.interval` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** pool info update interval,
         set to `null` to disable and call `exporter.observe()` manually (optional, default `10000`)
    -   `opts.minName` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the min size of
         the pool metric (optional, default `"pool_min_total"`)
    -   `opts.maxName` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the max size of
         the pool metric (optional, default `"pool_max_total"`)
    -   `opts.sizeName` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the number of
         resources that are currently acquired metric (optional, default `"pool_size_total"`)
    -   `opts.spareResourceCapacityName` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the number of resources the pool could create before hitting any limits (optional, default `"pool_spare_resource_capacity_total"`)
    -   `opts.availableName` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the
         number of unused resources in the pool (optional, default `"pool_available_total"`)
    -   `opts.borrowedName` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the
         number of resources that are currently acquired by userland code (optional, default `"pool_borrowed_total"`)
    -   `opts.pendingName` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the number
         of callers waiting to acquire a resource (optional, default `"pool_pending_total"`)

**Examples**

_With `generic-pool` (node-pool)_

```javascript
const pool = require('generic-pool);
const poolExporter = require('generic-pool-prometheus-exporter');

const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
const exporter = poolExporter(myPool);

// exporter.registry.metrics()
// exporter.registry.off()
```

```javascript
<caption>With manual observe
const pool = require('generic-pool);
const poolExporter = require('generic-pool-prometheus-exporter');

const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
const exporter = poolExporter(myPool, { interval: null });

// exporter.observe();
// exporter.registry.metrics()
// exporter.observe();
// exporter.registry.metrics()
```

_With `knex`_

```javascript
const Knex = require('knex');
const poolExporter = require('generic-pool-prometheus-exporter');

const knex = Knex({
 client: 'mysql'
 ...
});
const exporter = poolExporter(knex);

console.log(exporter.registry.metrics())
// =>
// # HELP pool_min_total min size of the pool
// # TYPE pool_min_total gauge
// pool_min_total 2

// # HELP pool_max_total max size of the pool
// # TYPE pool_max_total gauge
// pool_max_total 3

// # HELP pool_size_total number of resources that are currently acquired
// # TYPE pool_size_total gauge
// pool_size_total 1

// # HELP pool_spare_resource_capacity_total number of resources the pool could create before hitting any limits
// # TYPE pool_spare_resource_capacity_total gauge
// pool_spare_resource_capacity_total 2

// # HELP pool_available_total number of unused resources in the pool
// # TYPE pool_available_total gauge
// pool_available_total 0

// # HELP pool_borrowed_total number of resources that are currently acquired by userland code
// # TYPE pool_borrowed_total gauge
// pool_borrowed_total 1

// # HELP pool_pending_total number of callers waiting to acquire a resource
// # TYPE pool_pending_total
// pool_pending_total 0
```

Returns **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** exporter { registry, off, observe }

# generic-pool-prometheus-exporter

[![Build Status](https://travis-ci.org/hekike/generic-pool-prometheus-exporter.svg?branch=master)](https://travis-ci.org/hekike/generic-pool-prometheus-exporter)

Prometheus exporter for the [generic-pool](https://github.com/coopernurse/node-pool)
`npm` package that's used by [knex](https://www.npmjs.com/package/knex).

# API

## poolExporter

Create pool exporter

**Types:**

-   `{type=min}` min size of the pool
-   `{type=max}` size of the pool
-   `{type=acquired}` number of resources that are currently acquired
-   `{type=spare_capacity}` number of resources the pool could create before
     hitting any limits
-   `{type=available}` number of unused resources in the pool
-   `{type=borrowed}` number of resources that are currently acquired by
     userland code
-   `{type=pending}` number of callers waiting to acquire a resource

**Metrics:**

    # HELP pool_size_total Size of the pool
    # TYPE pool_size_total gauge
    pool_size_total{type="min"} 2
    pool_size_total{type="max"} 3
    pool_size_total{type="acquired"} 1
    pool_size_total{type="spare_capacity"} 2
    pool_size_total{type="available"} 0
    pool_size_total{type="borrowed"} 1
    pool_size_total{type="pending"} 0

**Parameters**

-   `pool` **Pool**  generic-pool instance
-   `opts` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?** options
    -   `opts.register` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** register to use
    -   `opts.name` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** metrics name (optional, default `"pool_size_total"`)
    -   `opts.labels` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** extra labels (optional, default `{}`)
    -   `opts.interval` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** pool info update interval,
         set to `null` to disable and call `exporter.observe()` manually (optional, default `10000`)

**Examples**

_With `generic-pool` (node-pool)_

```javascript
const promClient = require('prom-client');
const pool = require('generic-pool');
const poolExporter = require('generic-pool-prometheus-exporter');

const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
const exporter = poolExporter(myPool);

console.log(promClient.register.metrics())
// exporter.registry.off()
```

```javascript
<caption>With manual observe
const promClient = require('prom-client');
const pool = require('generic-pool');
const poolExporter = require('generic-pool-prometheus-exporter');

const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
const exporter = poolExporter(myPool, { interval: null });

// exporter.observe();
console.log(promClient.register.metrics())
// exporter.observe();
console.log(promClient.register.metrics())
```

_With `knex`_

```javascript
const promClient = require('prom-client');
const Knex = require('knex');
const poolExporter = require('generic-pool-prometheus-exporter');

const knex = Knex({
 client: 'mysql'
 ...
});
const exporter = poolExporter(knex);

console.log(promClient.register.metrics())
// =>
// # HELP pool_size_total Size of the pool
// # TYPE pool_size_total gauge
// pool_size_total{type="min"} 2
// pool_size_total{type="max"} 3
// pool_size_total{type="acquired"} 1
// pool_size_total{type="spare_capacity"} 2
// pool_size_total{type="available"} 0
// pool_size_total{type="borrowed"} 1
// pool_size_total{type="pending"} 0
```

Returns **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** exporter { off, observe }

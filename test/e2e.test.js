const test = require('ava');
const promClient = require('prom-client');
const dedent = require('dedent');
const genericPool = require('generic-pool');
const poolExporter = require('../lib');

const resourceFactory = {
  create: () => ({
    disconnect: () => {}
  }),
  destroy: resource => {
    resource.disconnect();
  }
};

let pool;
let exporter;
let register;

test.beforeEach(() => {
  register = new promClient.Registry();
  pool = genericPool.createPool(resourceFactory, {
    max: 3,
    min: 2
  });
});

test.afterEach.always(() => {
  exporter.off();
});

test.serial('tracks pool size', async t => {
  exporter = poolExporter(pool, { register });

  t.deepEqual(
    register.metrics(),
    dedent`
      # HELP pool_size_total Size of the pool
      # TYPE pool_size_total gauge
      pool_size_total{type="min"} 2
      pool_size_total{type="max"} 3
      pool_size_total{type="acquired"} 2
      pool_size_total{type="spare_capacity"} 1
      pool_size_total{type="available"} 0
      pool_size_total{type="borrowed"} 0
      pool_size_total{type="pending"} 0\n
    `
  );

  const client1 = await pool.acquire();
  const client2 = await pool.acquire();
  const client3 = await pool.acquire();

  exporter.observe();

  t.deepEqual(
    register.metrics(),
    dedent`
      # HELP pool_size_total Size of the pool
      # TYPE pool_size_total gauge
      pool_size_total{type="min"} 2
      pool_size_total{type="max"} 3
      pool_size_total{type="acquired"} 3
      pool_size_total{type="spare_capacity"} 0
      pool_size_total{type="available"} 0
      pool_size_total{type="borrowed"} 3
      pool_size_total{type="pending"} 0\n
    `
  );

  pool.destroy(client1);
  pool.destroy(client2);
  pool.release(client3);

  await pool.acquire();

  exporter.observe();

  t.deepEqual(
    register.metrics(),
    dedent`
      # HELP pool_size_total Size of the pool
      # TYPE pool_size_total gauge
      pool_size_total{type="min"} 2
      pool_size_total{type="max"} 3
      pool_size_total{type="acquired"} 1
      pool_size_total{type="spare_capacity"} 2
      pool_size_total{type="available"} 0
      pool_size_total{type="borrowed"} 1
      pool_size_total{type="pending"} 0\n
    `
  );
});

test.serial('respects name and labels options', t => {
  exporter = poolExporter(pool, {
    register,
    labels: { foo: 'bar' },
    name: 'my_pool_size_total'
  });

  t.deepEqual(
    register.metrics(),
    dedent`
      # HELP my_pool_size_total Size of the pool
      # TYPE my_pool_size_total gauge
      my_pool_size_total{type="min",foo="bar"} 2
      my_pool_size_total{type="max",foo="bar"} 3
      my_pool_size_total{type="acquired",foo="bar"} 2
      my_pool_size_total{type="spare_capacity",foo="bar"} 1
      my_pool_size_total{type="available",foo="bar"} 0
      my_pool_size_total{type="borrowed",foo="bar"} 0
      my_pool_size_total{type="pending",foo="bar"} 0\n
    `
  );
});

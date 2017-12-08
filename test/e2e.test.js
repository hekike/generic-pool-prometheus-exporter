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
      # HELP pool_min_total min size of the pool
      # TYPE pool_min_total gauge
      pool_min_total 2

      # HELP pool_max_total max size of the pool
      # TYPE pool_max_total gauge
      pool_max_total 3

      # HELP pool_size_total number of resources that are currently acquired
      # TYPE pool_size_total gauge
      pool_size_total 2

      # HELP pool_spare_resource_capacity_total number of resources the pool could create before hitting any limits
      # TYPE pool_spare_resource_capacity_total gauge
      pool_spare_resource_capacity_total 1

      # HELP pool_available_total number of unused resources in the pool
      # TYPE pool_available_total gauge
      pool_available_total 0

      # HELP pool_borrowed_total number of resources that are currently acquired by userland code
      # TYPE pool_borrowed_total gauge
      pool_borrowed_total 0

      # HELP pool_pending_total number of callers waiting to acquire a resource
      # TYPE pool_pending_total gauge
      pool_pending_total 0\n
    `
  );

  const client1 = await pool.acquire();
  const client2 = await pool.acquire();
  const client3 = await pool.acquire();

  exporter.observe();

  t.deepEqual(
    register.metrics(),
    dedent`
      # HELP pool_min_total min size of the pool
      # TYPE pool_min_total gauge
      pool_min_total 2

      # HELP pool_max_total max size of the pool
      # TYPE pool_max_total gauge
      pool_max_total 3

      # HELP pool_size_total number of resources that are currently acquired
      # TYPE pool_size_total gauge
      pool_size_total 3

      # HELP pool_spare_resource_capacity_total number of resources the pool could create before hitting any limits
      # TYPE pool_spare_resource_capacity_total gauge
      pool_spare_resource_capacity_total 0

      # HELP pool_available_total number of unused resources in the pool
      # TYPE pool_available_total gauge
      pool_available_total 0

      # HELP pool_borrowed_total number of resources that are currently acquired by userland code
      # TYPE pool_borrowed_total gauge
      pool_borrowed_total 3

      # HELP pool_pending_total number of callers waiting to acquire a resource
      # TYPE pool_pending_total gauge
      pool_pending_total 0\n
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
      # HELP pool_min_total min size of the pool
      # TYPE pool_min_total gauge
      pool_min_total 2

      # HELP pool_max_total max size of the pool
      # TYPE pool_max_total gauge
      pool_max_total 3

      # HELP pool_size_total number of resources that are currently acquired
      # TYPE pool_size_total gauge
      pool_size_total 1

      # HELP pool_spare_resource_capacity_total number of resources the pool could create before hitting any limits
      # TYPE pool_spare_resource_capacity_total gauge
      pool_spare_resource_capacity_total 2

      # HELP pool_available_total number of unused resources in the pool
      # TYPE pool_available_total gauge
      pool_available_total 0

      # HELP pool_borrowed_total number of resources that are currently acquired by userland code
      # TYPE pool_borrowed_total gauge
      pool_borrowed_total 1

      # HELP pool_pending_total number of callers waiting to acquire a resource
      # TYPE pool_pending_total gauge
      pool_pending_total 0\n
    `
  );
});

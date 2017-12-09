const assert = require('assert');
const promClient = require('prom-client');

/**
 * @private
 * @function getPoolInfo
 * @param {Pool} pool - generic-pool instance
 * @returns {Object} pool info - {
 *  spareResourceCapacity,
 *  size,
 *  available,
 *  borrowed,
 *  pending,
 *  max,
 *  min
 * }
 */
function getPoolInfo(pool) {
  return {
    spareResourceCapacity: pool.spareResourceCapacity,
    size: pool.size,
    available: pool.available,
    borrowed: pool.borrowed,
    pending: pool.pending,
    max: pool.max,
    min: pool.min
  };
}

/**
 * Create pool exporter
 *
 * **Types:**
 *
 * - `{type=min}` min size of the pool
 * - `{type=max}` size of the pool
 * - `{type=acquired}` number of resources that are currently acquired
 * - `{type=spare_capacity}` number of resources the pool could create before
 *    hitting any limits
 * - `{type=available}` number of unused resources in the pool
 * - `{type=borrowed}` number of resources that are currently acquired by
 *    userland code
 * - `{type=pending}` number of callers waiting to acquire a resource
 *
 * @public
 * @function poolExporter
 * @param {Pool} pool -  generic-pool instance
 * @param {Object} [opts] - options
 * @param {String} [opts.register] - register to use
 * @param {Object} [opts.labels={}] - extra labels
 * @param {String} [opts.prefix="pool_"] - metric name prefix
 * @param {Number} [opts.interval=10000] - pool info update interval,
 *  set to `null` to disable and call `exporter.observe()` manually
 * @param {String} [opts.minName="min_total"] - name of the min size of
 *  the pool metric
 * @param {String} [opts.maxName="max_total"] - name of the max size of
 *  the pool metric
 * @param {String} [opts.sizeName="size_total"] - name of the number of
 *  resources that are currently acquired metric
 * @param {String} [opts.spareResourceCapacityName="spare_resource_capacity_total"]
 *  - name of the number of resources the pool could create before hitting any limits
 * @param {String} [opts.availableName="available_total"] - name of the
 *  number of unused resources in the pool
 * @param {String} [opts.borrowedName="borrowed_total"] - name of the
 *  number of resources that are currently acquired by userland code
 * @param {String} [opts.pendingName="pending_total"] - name of the number
 *  of callers waiting to acquire a resource
 * @returns {Function} exporter { off, observe }
 * @example
 * <caption>With `generic-pool` (node-pool)</caption>
 * const promClient = require('prom-client');
 * const pool = require('generic-pool');
 * const poolExporter = require('generic-pool-prometheus-exporter');
 *
 * const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
 * const exporter = poolExporter(myPool);
 *
 * console.log(promClient.register.metrics())
 * // exporter.registry.off()
 * @example
 * <caption>With manual observe
 * const promClient = require('prom-client');
 * const pool = require('generic-pool');
 * const poolExporter = require('generic-pool-prometheus-exporter');
 *
 * const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
 * const exporter = poolExporter(myPool, { interval: null });
 *
 * // exporter.observe();
 * console.log(promClient.register.metrics())
 * // exporter.observe();
 * console.log(promClient.register.metrics())
 * @example
 * <caption>With `knex`</caption>
 * const promClient = require('prom-client');
 * const Knex = require('knex');
 * const poolExporter = require('generic-pool-prometheus-exporter');
 *
 * const knex = Knex({
 *  client: 'mysql'
 *  ...
 * });
 * const exporter = poolExporter(knex);
 *
 * console.log(promClient.register.metrics())
 * // =>
 * // # HELP pool_size_total Size of the pool
 * // # TYPE pool_size_total gauge
 * // pool_size_total{type="min"} 2
 * // pool_size_total{type="max"} 3
 * // pool_size_total{type="acquired"} 1
 * // pool_size_total{type="spare_capacity"} 2
 * // pool_size_total{type="available"} 0
 * // pool_size_total{type="borrowed"} 1
 * // pool_size_total{type="pending"} 0
 */
function poolExporter(
  pool,
  {
    register = promClient.register,
    labels = {},
    name = 'pool_size_total',
    interval = 10000
  } = {}
) {
  assert(pool, 'pool instance is required');

  const metric = new promClient.Gauge({
    name,
    help: 'Size of the pool',
    labelNames: ['type'].concat(Object.keys(labels)),
    registers: []
  });

  let intervalId;

  register.registerMetric(metric);

  function observe() {
    const info = getPoolInfo(pool);

    // min size of the pool
    metric.set(Object.assign({ type: 'min' }, labels), info.min);
    // max size of the pool
    metric.set(Object.assign({ type: 'max' }, labels), info.max);
    // number of resources that are currently acquired
    metric.set(Object.assign({ type: 'acquired' }, labels), info.size);
    // number of resources the pool could create before hitting any limits
    metric.set(
      Object.assign({ type: 'spare_capacity' }, labels),
      info.spareResourceCapacity
    );
    // number of unused resources in the pool
    metric.set(Object.assign({ type: 'available' }, labels), info.available);
    // number of resources that are currently acquired by userland code
    metric.set(Object.assign({ type: 'borrowed' }, labels), info.borrowed);
    // number of callers waiting to acquire a resource
    metric.set(Object.assign({ type: 'pending' }, labels), info.pending);
  }

  function off() {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }

  // initial
  observe();

  // observe periodically
  if (typeof interval === 'number') {
    intervalId = setInterval(observe, interval);
  }

  return {
    observe,
    off
  };
}

module.exports = poolExporter;

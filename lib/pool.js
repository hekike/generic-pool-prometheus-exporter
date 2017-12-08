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
 * @public
 * @function poolExporter
 * @param {Pool} pool -  generic-pool instance
 * @param {Object} [opts] - options
 * @param {Number} [opts.interval=10000] - pool info update interval,
 *  set to `null` to disable and call `exporter.observe()` manually
 * @param {String } [opts.minName="pool_min_total"] - name of the min size of
 *  the pool metric
 * @param {String } [opts.maxName="pool_max_total"] - name of the max size of
 *  the pool metric
 * @param {String } [opts.sizeName="pool_size_total"] - name of the number of
 *  resources that are currently acquired metric
 * @param {String } [opts.spareResourceCapacityName="pool_spare_resource_capacity_total"]
 *  - name of the number of resources the pool could create before hitting any limits
 * @param {String } [opts.availableName="pool_available_total"] - name of the
 *  number of unused resources in the pool
 * @param {String } [opts.borrowedName="pool_borrowed_total"] - name of the
 *  number of resources that are currently acquired by userland code
 * @param {String } [opts.pendingName="pool_pending_total"] - name of the number
 *  of callers waiting to acquire a resource
 * @returns {Function} exporter { registry, off, observe }
 * @example
 * <caption>With `generic-pool` (node-pool)</caption>
 * const pool = require('generic-pool);
 * const poolExporter = require('generic-pool-prometheus-exporter');
 *
 * const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
 * const exporter = poolExporter(myPool);
 *
 * // exporter.registry.metrics()
 * // exporter.registry.off()
 * @example
 * <caption>With manual observe
 * const pool = require('generic-pool);
 * const poolExporter = require('generic-pool-prometheus-exporter');
 *
 * const myPool = genericPool.createPool({ ... }, { min 1, max: 5 });
 * const exporter = poolExporter(myPool, { interval: null });
 *
 * // exporter.observe();
 * // exporter.registry.metrics()
 * // exporter.observe();
 * // exporter.registry.metrics()
 * @example
 * <caption>With `knex`</caption>
 * const Knex = require('knex');
 * const poolExporter = require('generic-pool-prometheus-exporter');
 *
 * const knex = Knex({
 *  client: 'mysql'
 *  ...
 * });
 * const exporter = poolExporter(knex);
 *
 * console.log(exporter.registry.metrics())
 * // =>
 * // # HELP pool_min_total min size of the pool
 * // # TYPE pool_min_total gauge
 * // pool_min_total 2

 * // # HELP pool_max_total max size of the pool
 * // # TYPE pool_max_total gauge
 * // pool_max_total 3

 * // # HELP pool_size_total number of resources that are currently acquired
 * // # TYPE pool_size_total gauge
 * // pool_size_total 1

 * // # HELP pool_spare_resource_capacity_total number of resources the pool could create before hitting any limits
 * // # TYPE pool_spare_resource_capacity_total gauge
 * // pool_spare_resource_capacity_total 2

 * // # HELP pool_available_total number of unused resources in the pool
 * // # TYPE pool_available_total gauge
 * // pool_available_total 0

 * // # HELP pool_borrowed_total number of resources that are currently acquired by userland code
 * // # TYPE pool_borrowed_total gauge
 * // pool_borrowed_total 1

 * // # HELP pool_pending_total number of callers waiting to acquire a resource
 * // # TYPE pool_pending_total
 * // pool_pending_total 0
 */
function poolExporter(
  pool,
  {
    interval = 10000,
    minName = 'pool_min_total',
    maxName = 'pool_max_total',
    sizeName = 'pool_size_total',
    spareResourceCapacityName = 'pool_spare_resource_capacity_total',
    availableName = 'pool_available_total',
    borrowedName = 'pool_borrowed_total',
    pendingName = 'pool_pending_total'
  } = {}
) {
  assert(pool, 'pool instance is required');

  const registry = new promClient.Registry();

  const minMetric = new promClient.Gauge({
    name: minName,
    help: 'min size of the pool',
    registers: []
  });
  const maxMetric = new promClient.Gauge({
    name: maxName,
    help: 'max size of the pool',
    registers: []
  });
  const sizeMetric = new promClient.Gauge({
    name: sizeName,
    help: 'number of resources that are currently acquired',
    registers: []
  });
  const spareResourceCapacityMetric = new promClient.Gauge({
    name: spareResourceCapacityName,
    help: 'number of resources the pool could create before hitting any limits',
    registers: []
  });
  const availableMetric = new promClient.Gauge({
    name: availableName,
    help: 'number of unused resources in the pool',
    registers: []
  });
  const borrowedMetric = new promClient.Gauge({
    name: borrowedName,
    help: 'number of resources that are currently acquired by userland code',
    registers: []
  });
  const pendingMetric = new promClient.Gauge({
    name: pendingName,
    help: 'number of callers waiting to acquire a resource',
    registers: []
  });

  let intervalId;

  registry.registerMetric(minMetric);
  registry.registerMetric(maxMetric);
  registry.registerMetric(sizeMetric);
  registry.registerMetric(spareResourceCapacityMetric);
  registry.registerMetric(availableMetric);
  registry.registerMetric(borrowedMetric);
  registry.registerMetric(pendingMetric);

  function observe() {
    const info = getPoolInfo(pool);

    minMetric.set(info.min);
    maxMetric.set(info.max);
    sizeMetric.set(info.size);
    spareResourceCapacityMetric.set(info.spareResourceCapacity);
    availableMetric.set(info.available);
    borrowedMetric.set(info.borrowed);
    pendingMetric.set(info.pending);
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
    registry,
    observe,
    off
  };
}

module.exports = poolExporter;

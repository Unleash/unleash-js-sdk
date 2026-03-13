import { InMemoryMetricRegistry, MetricsAPI } from './impact-metrics';

describe('Impact Metrics', () => {
  describe('InMemoryMetricRegistry', () => {
    test('should create and retrieve counter', () => {
      const registry = new InMemoryMetricRegistry();
      const counter = registry.counter({ name: 'test_counter', help: 'Test counter' });

      expect(counter).toBeDefined();
      expect(registry.getCounter('test_counter')).toBe(counter);
    });

    test('should increment counter', () => {
      const registry = new InMemoryMetricRegistry();
      const counter = registry.counter({ name: 'test_counter', help: 'Test' });

      counter.inc(5);
      const collected = registry.collect();

      expect(collected[0].samples[0].value).toBe(5);
    });

    test('should handle counter with labels', () => {
      const registry = new InMemoryMetricRegistry();
      const counter = registry.counter({ name: 'api_calls', help: 'API calls' });

      counter.inc(3, { endpoint: '/users' });
      counter.inc(2, { endpoint: '/products' });

      const collected = registry.collect();
      expect(collected[0].samples.length).toBe(2);
      expect(collected[0].samples[0].value).toBe(3);
      expect(collected[0].samples[1].value).toBe(2);
    });

    test('should clear metrics after collection', () => {
      const registry = new InMemoryMetricRegistry();
      const counter = registry.counter({ name: 'test', help: 'Test' });

      counter.inc(5);
      registry.collect();

      // After collection, counter should be cleared
      counter.inc(3);
      const collected = registry.collect();
      expect(collected[0].samples[0].value).toBe(3);
    });

    test('should collect multiple counters', () => {
      const registry = new InMemoryMetricRegistry();

      const counter1 = registry.counter({ name: 'counter1', help: 'Counter 1' });
      const counter2 = registry.counter({ name: 'counter2', help: 'Counter 2' });

      counter1.inc(5);
      counter2.inc(10);

      const collected = registry.collect();
      expect(collected.length).toBe(2);
      expect(collected[0].samples[0].value).toBe(5);
      expect(collected[1].samples[0].value).toBe(10);
    });
  });

  describe('MetricsAPI', () => {
    test('should define counter', () => {
      const registry = new InMemoryMetricRegistry();
      const api = new MetricsAPI(registry, 'test-app');

      api.defineCounter('test_counter', 'Test counter');
      expect(registry.getCounter('test_counter')).toBeDefined();
    });

    test('should increment counter with app name label', () => {
      const registry = new InMemoryMetricRegistry();
      const api = new MetricsAPI(registry, 'my-app');

      api.defineCounter('purchases', 'Purchases');
      api.incrementCounter('purchases', 5);

      const collected = registry.collect();
      expect(collected[0].samples[0].labels.appName).toBe('my-app');
      expect(collected[0].samples[0].value).toBe(5);
    });

    test('should merge custom labels with app name', () => {
      const registry = new InMemoryMetricRegistry();
      const api = new MetricsAPI(registry, 'my-app');

      api.defineCounter('api_calls', 'API calls');
      api.incrementCounter('api_calls', 3, { endpoint: '/users' });

      const collected = registry.collect();
      expect(collected[0].samples[0].labels).toEqual({
        appName: 'my-app',
        endpoint: '/users',
      });
      expect(collected[0].samples[0].value).toBe(3);
    });

    test('should warn when counter not defined', () => {
      const registry = new InMemoryMetricRegistry();
      const api = new MetricsAPI(registry, 'my-app');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      api.incrementCounter('undefined_counter', 5);

      expect(warnSpy).toHaveBeenCalledWith(
        'Counter undefined_counter not defined'
      );
      warnSpy.mockRestore();
    });

    test('should handle multiple counters with different labels', () => {
      const registry = new InMemoryMetricRegistry();
      const api = new MetricsAPI(registry, 'my-app');

      api.defineCounter('requests', 'HTTP requests');
      api.incrementCounter('requests', 5, { method: 'GET' });
      api.incrementCounter('requests', 3, { method: 'POST' });
      api.incrementCounter('requests', 2, { method: 'DELETE' });

      const collected = registry.collect();
      expect(collected[0].samples.length).toBe(3);
    });
  });

  describe('Integration with Metrics', () => {
    test('should include impact metrics in payload', async () => {
      const { FetchMock } = require('jest-fetch-mock');
      const fetchMock = fetch as FetchMock;

      const Metrics = (await import('./metrics')).default;

      const registry = new InMemoryMetricRegistry();
      const api = new MetricsAPI(registry, 'test-app');

      api.defineCounter('events', 'Total events');
      api.incrementCounter('events', 10);

      const metrics = new Metrics({
        onError: console.error,
        appName: 'test-app',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 0,
        connectionId: '123',
        metricRegistry: registry,
      });

      await metrics.sendMetrics();

      expect(fetchMock.mock.calls.length).toEqual(1);
      const [, options] = fetchMock.mock.calls[0];
      const payload = JSON.parse(options.body);

      expect(payload.impactMetrics).toBeDefined();
      expect(payload.impactMetrics.length).toBeGreaterThan(0);
      expect(payload.impactMetrics[0].name).toBe('events');
      expect(payload.impactMetrics[0].samples[0].value).toBe(10);
    });
  });
});

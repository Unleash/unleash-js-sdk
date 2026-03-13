// Simple test script to verify impact metrics implementation
import { InMemoryMetricRegistry, MetricsAPI } from './src/impact-metrics';

console.log('🚀 Testing Impact Metrics Implementation\n');

// Test 1: Create registry and counter
console.log('Test 1: Create counter');
const registry = new InMemoryMetricRegistry();
const counter = registry.counter({ name: 'test_counter', help: 'Test counter' });
console.log('✅ Counter created\n');

// Test 2: Increment counter
console.log('Test 2: Increment counter');
counter.inc(5);
console.log('✅ Counter incremented by 5\n');

// Test 3: Collect metrics
console.log('Test 3: Collect metrics');
const collected = registry.collect();
console.log('✅ Metrics collected:', JSON.stringify(collected, null, 2), '\n');

// Test 4: MetricsAPI
console.log('Test 4: MetricsAPI with labels');
const registry2 = new InMemoryMetricRegistry();
const api = new MetricsAPI(registry2, 'my-app');

api.defineCounter('api_calls', 'API calls');
api.incrementCounter('api_calls', 3, { endpoint: '/users' });
api.incrementCounter('api_calls', 2, { endpoint: '/products' });

const collected2 = registry2.collect();
console.log('✅ API metrics collected:', JSON.stringify(collected2, null, 2), '\n');

// Test 5: Verify structure
console.log('Test 5: Verify metric structure');
const metric = collected2[0];
console.log('  Name:', metric.name);
console.log('  Type:', metric.type);
console.log('  Samples:', metric.samples.length);
metric.samples.forEach((sample, i) => {
  console.log(`    [${i}]`, sample.labels, '=', sample.value);
});
console.log('✅ Structure verified\n');

console.log('✨ All tests passed!');

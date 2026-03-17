import { MetricsAPI } from '../../impact-metrics/metric-api';
import {
    MetricLabels,
    MetricOptions,
    type ImpactMetricRegistry,
} from '../../impact-metrics/metric-types';

test('should not register a counter with empty name or help', () => {
    let counterRegistered = false;

    const fakeRegistry = {
        counter: () => {
            counterRegistered = true;
        },
    } as unknown as ImpactMetricRegistry;

    const api = new MetricsAPI(fakeRegistry, 'my-app');

    api.defineCounter('some_name', '');
    expect(counterRegistered).toBe(false);

    api.defineCounter('', 'some_help');
    expect(counterRegistered).toBe(false);
});

test('should register a counter with valid name and help', () => {
    let counterRegistered = false;

    const fakeRegistry = {
        counter: () => {
            counterRegistered = true;
        },
    } as unknown as ImpactMetricRegistry;

    const api = new MetricsAPI(fakeRegistry, 'test-app');

    api.defineCounter('valid_name', 'Valid help text');
    expect(counterRegistered).toBe(true);
});

test('should increment counter with valid parameters', () => {
    let counterIncremented = false;
    let recordedLabels: MetricLabels = {};

    const fakeCounter = {
        inc: (_value: number, labels: MetricLabels) => {
            counterIncremented = true;
            recordedLabels = labels;
        },
    };

    const fakeRegistry = {
        getCounter: () => fakeCounter,
    } as unknown as ImpactMetricRegistry;

    const api = new MetricsAPI(fakeRegistry, 'my-app');

    api.incrementCounter('valid_counter', 5);
    expect(counterIncremented).toBe(true);
    expect(recordedLabels).toStrictEqual({
        appName: 'my-app',
    });
});

test('defining a counter automatically sets label names', () => {
    let counterRegistered = false;

    const fakeRegistry = {
        counter: (config: MetricOptions) => {
            counterRegistered = true;
            expect(config.labelNames).toStrictEqual([
                'featureName',
                'appName',
                'environment',
            ]);
        },
    } as unknown as ImpactMetricRegistry;

    const api = new MetricsAPI(fakeRegistry, 'my-app');

    api.defineCounter('test_counter', 'Test help text');
    expect(counterRegistered).toBe(true);
});

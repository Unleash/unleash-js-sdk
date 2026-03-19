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

    const api = new MetricsAPI(fakeRegistry, 'my-app', 'default');

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

    const api = new MetricsAPI(fakeRegistry, 'my-app', 'default');

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

    const api = new MetricsAPI(fakeRegistry, 'my-app', 'default');

    api.incrementCounter('valid_counter', 5);
    expect(counterIncremented).toBe(true);
    expect(recordedLabels).toStrictEqual({
        appName: 'my-app',
        environment: 'default',
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

    const api = new MetricsAPI(fakeRegistry, 'my-app', 'default');

    api.defineCounter('test_counter', 'Test help text');
    expect(counterRegistered).toBe(true);
});

test('should not register a histogram with empty name or help', () => {
    let histogramRegistered = false;

    const fakeRegistry = {
        histogram: () => {
            histogramRegistered = true;
        },
    } as unknown as ImpactMetricRegistry;

    const api = new MetricsAPI(fakeRegistry, 'my-app', 'default');

    api.defineHistogram('some_name', '');
    expect(histogramRegistered).toBe(false);

    api.defineHistogram('', 'some_help');
    expect(histogramRegistered).toBe(false);
});

test('should register a histogram with valid name and help', () => {
    let histogramRegistered = false;

    const fakeRegistry = {
        histogram: () => {
            histogramRegistered = true;
        },
    } as unknown as ImpactMetricRegistry;

    const api = new MetricsAPI(fakeRegistry, 'my-app', 'default');

    api.defineHistogram('valid_name', 'Valid help text');
    expect(histogramRegistered).toBe(true);
});

test('should observe histogram with valid parameters', () => {
    let histogramObserved = false;
    let recordedLabels: MetricLabels = {};

    const fakeHistogram = {
        observe: (_value: number, labels: MetricLabels) => {
            histogramObserved = true;
            recordedLabels = labels;
        },
    };

    const fakeRegistry = {
        getHistogram: () => fakeHistogram,
    } as unknown as ImpactMetricRegistry;

    const api = new MetricsAPI(fakeRegistry, 'my-app', 'default');

    api.observeHistogram('valid_histogram', 1.5);
    expect(histogramObserved).toBe(true);
    expect(recordedLabels).toStrictEqual({
        appName: 'my-app',
        environment: 'default',
    });
});

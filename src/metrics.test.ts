import { FetchMock } from 'jest-fetch-mock';
import Metrics from './metrics';
import {
    getTypeSafeRequest,
    getTypeSafeRequestUrl,
    parseRequestBodyWithType,
} from './test';
import { InMemoryMetricRegistry } from './impact-metrics/metric-types';

jest.useFakeTimers();

const fetchMock = fetch as FetchMock;

afterEach(() => {
    fetchMock.resetMocks();
    jest.clearAllTimers();
});

test('should be disabled by flag disableMetrics', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: true,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 0,
        connectionId: '123',
    });

    metrics.count('foo', true);

    await metrics.sendMetrics();

    expect(fetchMock.mock.calls.length).toEqual(0);
});

test('should send metrics', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 0,
        connectionId: '123',
    });

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    metrics.countVariant('foo', 'foo-variant');
    metrics.countVariant('foo', 'foo-variant');

    await metrics.sendMetrics();

    expect(fetchMock.mock.calls.length).toEqual(1);

    /** Parse request and get its body with casted type */
    const request = getTypeSafeRequest(fetchMock);
    const body = parseRequestBodyWithType<{ bucket: Metrics['bucket'] }>(
        request
    );

    expect(body.bucket.toggles.foo.yes).toEqual(2);
    expect(body.bucket.toggles.foo.no).toEqual(1);
    expect(body.bucket.toggles.bar.yes).toEqual(0);
    expect(body.bucket.toggles.bar.no).toEqual(1);
    expect(body.bucket.toggles.foo.variants).toEqual({ 'foo-variant': 2 });
});

test('should send metrics with custom auth header', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'NotAuthorization',
        metricsIntervalInitial: 0,
        connectionId: '123',
    });

    metrics.count('foo', true);
    await metrics.sendMetrics();

    const requestBody = getTypeSafeRequest(fetchMock);

    expect(fetchMock.mock.calls.length).toEqual(1);
    expect(requestBody.headers).toMatchObject({
        notauthorization: '123',
    });
});

test('Should send initial metrics after 2 seconds', () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 5,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 2,
        connectionId: '123',
    });

    metrics.start();

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Account for 2 second timeout before the set interval starts
    jest.advanceTimersByTime(2000);
    expect(fetchMock.mock.calls.length).toEqual(1);
});

test('Should send initial metrics after 20 seconds, when metricsIntervalInitial is higher than metricsInterval', () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 5,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 20,
        connectionId: '123',
    });

    metrics.start();

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Account for 20 second timeout before the set interval starts
    jest.advanceTimersByTime(20000);
    expect(fetchMock.mock.calls.length).toEqual(1);
});

test('Should send metrics for initial and after metrics interval', () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 5,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 2,
        connectionId: '123',
    });

    metrics.start();

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Account for 2 second timeout before the set interval starts
    jest.advanceTimersByTime(2000);
    metrics.count('foo', false);
    metrics.count('bar', false);
    jest.advanceTimersByTime(5000);
    expect(fetchMock.mock.calls.length).toEqual(2);
});

test('Should not send initial metrics if disabled', () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 5,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 0,
        connectionId: '123',
    });

    metrics.start();

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Account for 2 second timeout before the set interval starts
    jest.advanceTimersByTime(2000);
    expect(fetchMock.mock.calls.length).toEqual(0);
});

test('should send metrics based on timer interval', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 5,
        disableMetrics: false,
        url: new URL('http://localhost:3000'),
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 2,
        connectionId: '123',
    });

    metrics.start();

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Account for 2 second timeout before the set interval starts
    jest.advanceTimersByTime(2000);

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Fill bucket and advance the interval
    jest.advanceTimersByTime(5000);

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Fill bucket and advance the interval
    jest.advanceTimersByTime(5000);

    expect(fetchMock.mock.calls.length).toEqual(3);
});

describe('Custom headers for metrics', () => {
    const runMetrics = async (customHeaders: Record<string, string>) => {
        const metrics = new Metrics({
            onError: console.error,
            appName: 'test',
            metricsInterval: 5,
            disableMetrics: false,
            url: 'http://localhost:3000',
            clientKey: '123',
            fetch: fetchMock,
            headerName: 'Authorization',
            customHeaders,
            connectionId: '123',
            metricsIntervalInitial: 2,
        });

        metrics.count('foo', true);
        await metrics.sendMetrics();

        return getTypeSafeRequest(fetchMock);
    };

    test('Should apply any custom headers to the metrics request', async () => {
        const customHeaders = {
            'x-custom-header': '123',
        };

        const requestBody = await runMetrics(customHeaders);
        expect(requestBody.headers).toMatchObject(customHeaders);
    });

    test('Custom headers should override preset headers', async () => {
        const customHeaders = {
            authorization: 'definitely-not-the-client-key',
        };

        const requestBody = await runMetrics(customHeaders);
        expect(requestBody.headers).toMatchObject(customHeaders);
    });

    test('Empty custom headers do not override preset headers on collision', async () => {
        const customHeaders = {
            Authorization: null,
        };

        // @ts-expect-error this shouldn't be allowed in TS, but there's
        // nothing stopping you from doing it in JS.
        const requestBody = await runMetrics(customHeaders);
        expect(requestBody.headers).not.toMatchObject(customHeaders);
    });

    test.each([null, undefined])(
        'Custom headers that are "%s" should not be sent',
        async (emptyValue) => {
            const customHeaders = {
                'invalid-header': emptyValue,
            };

            // @ts-expect-error this shouldn't be allowed in TS, but there's
            // nothing stopping you from doing it in JS.
            const requestBody = await runMetrics(customHeaders);

            expect(requestBody.headers).not.toMatchObject(customHeaders);
        }
    );

    test('Should use case-insensitive headers', () => {
        const metrics = new Metrics({
            onError: console.error,
            appName: 'test',
            metricsInterval: 5,
            disableMetrics: false,
            url: 'http://localhost:3000',
            clientKey: '123',
            fetch: fetchMock,
            headerName: 'Authorization',
            customHeaders: {
                'Custom-Header': '123',
                'custom-header': '456',
                'unleash-APPname': 'override',
                'unleash-connection-id': 'override',
            },
            connectionId: '123',
            metricsIntervalInitial: 2,
        });

        metrics.count('foo', true);
        metrics.sendMetrics();

        const requestBody = getTypeSafeRequest(fetchMock);
        expect(requestBody.headers).toMatchObject({
            'custom-header': '456',
            'unleash-appname': 'override',
            'unleash-connection-id': '123',
        });
    });
});

test('should construct correct metrics URL', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000/api/frontend',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 0,
        connectionId: '123',
    });

    metrics.count('foo', true);
    await metrics.sendMetrics();

    const url = getTypeSafeRequestUrl(fetchMock);
    expect(url).toBe('http://localhost:3000/api/frontend/client/metrics');
});

test('should not construct metrics URL with double slashes', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000/api/frontend/',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        metricsIntervalInitial: 0,
        connectionId: '123',
    });

    metrics.count('foo', true);
    await metrics.sendMetrics();

    const url = getTypeSafeRequestUrl(fetchMock);
    expect(url).toBe('http://localhost:3000/api/frontend/client/metrics');
    expect(url).not.toBe('http://localhost:3000/api/frontend//client/metrics');
});

describe('Flush metrics on page hidden', () => {
    const simulatePageHidden = () => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
    };

    const simulatePageVisible = () => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        document.dispatchEvent(new Event('visibilitychange'));
    };

    let metricsInstance: Metrics | undefined;

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    afterEach(() => {
        metricsInstance?.stop();
        simulatePageVisible();
    });

    test('should send impact metrics with keepalive on page hidden', () => {
        const registry = new InMemoryMetricRegistry();
        const counter = registry.counter({
            name: 'test_counter',
            help: 'test',
        });

        metricsInstance = new Metrics({
            onError: console.error,
            appName: 'test',
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

        metricsInstance.start();
        counter.inc(5, { appName: 'test', environment: 'default' });

        simulatePageHidden();

        const flushCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];

        const [url, options] = flushCall as any;
        expect(url).toContain('/client/metrics');
        expect(options.keepalive).toBe(true);

        const body = JSON.parse(options.body);
        expect(body.impactMetrics).toHaveLength(1);
        expect(body.impactMetrics[0].name).toBe('test_counter');
    });

    test('should not double-send metrics after interval on page hidden, only zero values', async () => {
        const registry = new InMemoryMetricRegistry();
        const histogram = registry.histogram({
            name: 'test_histogram',
            help: 'test',
        });

        metricsInstance = new Metrics({
            onError: console.error,
            appName: 'test',
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

        metricsInstance.start();
        histogram.observe(0.5, { appName: 'test', environment: 'default' });

        await metricsInstance.sendMetrics();

        const [, intervalOptions] = fetchMock.mock.calls[0] as any;
        const intervalBody = JSON.parse(intervalOptions.body);
        expect(intervalBody.impactMetrics[0].name).toBe('test_histogram');
        expect(intervalBody.impactMetrics[0].samples[0].count).toEqual(1);

        simulatePageHidden();

        expect(fetchMock.mock.calls.length).toEqual(2);

        const [, pageHiddenOptions] = fetchMock.mock.calls[1] as any;
        const pageHiddenBody = JSON.parse(pageHiddenOptions.body);
        expect(pageHiddenBody.impactMetrics[0].samples[0].count).toEqual(0);
    });
});

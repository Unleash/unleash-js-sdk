import { InMemoryMetricRegistry } from '../../impact-metrics/metric-types';

test('Counter increments by default value', () => {
    const registry = new InMemoryMetricRegistry();
    const counter = registry.counter({ name: 'test_counter', help: 'testing' });

    counter.inc();

    const result = registry.collect();
    const metric = result.find((m) => m.name === 'test_counter');

    expect(metric).toStrictEqual({
        name: 'test_counter',
        help: 'testing',
        type: 'counter',
        samples: [
            {
                labels: {},
                value: 1,
            },
        ],
    });
});

test('Counter increments with custom value and labels', () => {
    const registry = new InMemoryMetricRegistry();
    const counter = registry.counter({
        name: 'labeled_counter',
        help: 'with labels',
    });

    counter.inc(3, { foo: 'bar' });
    counter.inc(2, { foo: 'bar' });

    const result = registry.collect();
    const metric = result.find((m) => m.name === 'labeled_counter');

    expect(metric).toStrictEqual({
        name: 'labeled_counter',
        help: 'with labels',
        type: 'counter',
        samples: [
            {
                labels: { foo: 'bar' },
                value: 5,
            },
        ],
    });
});

test('Different label combinations are stored separately', () => {
    const registry = new InMemoryMetricRegistry();
    const counter = registry.counter({
        name: 'multi_label',
        help: 'label test',
    });

    counter.inc(1, { a: 'x' });
    counter.inc(2, { b: 'y' });
    counter.inc(3);

    const result = registry.collect();
    const metric = result.find((m) => m.name === 'multi_label');

    expect(metric).toStrictEqual({
        name: 'multi_label',
        help: 'label test',
        type: 'counter',
        samples: [
            { labels: { a: 'x' }, value: 1 },
            { labels: { b: 'y' }, value: 2 },
            { labels: {}, value: 3 },
        ],
    });
});

test('collect returns counter with zero value when counter is empty', () => {
    const registry = new InMemoryMetricRegistry();
    registry.counter({ name: 'noop_counter', help: 'noop' });

    const result = registry.collect();
    expect(result).toStrictEqual([
        {
            name: 'noop_counter',
            help: 'noop',
            type: 'counter',
            samples: [
                {
                    labels: {},
                    value: 0,
                },
            ],
        },
    ]);
});

test('collect returns counter with zero value after flushing previous values', () => {
    const registry = new InMemoryMetricRegistry();
    const counter = registry.counter({ name: 'flush_test', help: 'flush' });

    counter.inc(1);
    const first = registry.collect();
    expect(first).toBeTruthy();
    expect(first).toHaveLength(1);

    const second = registry.collect();
    expect(second).toStrictEqual([
        {
            name: 'flush_test',
            help: 'flush',
            type: 'counter',
            samples: [
                {
                    labels: {},
                    value: 0,
                },
            ],
        },
    ]);
});

test('restore reinserts collected metrics into the registry', () => {
    const registry = new InMemoryMetricRegistry();
    const counter = registry.counter({
        name: 'restore_test',
        help: 'testing restore',
    });

    counter.inc(5, { tag: 'a' });
    counter.inc(2, { tag: 'b' });

    const flushed = registry.collect();
    expect(flushed).toHaveLength(1);

    const afterFlush = registry.collect();
    expect(afterFlush).toStrictEqual([
        {
            name: 'restore_test',
            help: 'testing restore',
            type: 'counter',
            samples: [
                {
                    labels: {},
                    value: 0,
                },
            ],
        },
    ]);

    registry.restore(flushed);

    const restored = registry.collect();
    expect(restored).toStrictEqual([
        {
            name: 'restore_test',
            help: 'testing restore',
            type: 'counter',
            samples: [
                { labels: { tag: 'a' }, value: 5 },
                { labels: { tag: 'b' }, value: 2 },
            ],
        },
    ]);
});

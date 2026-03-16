export type MetricLabels = Record<string, string>;

export interface NumericMetricSample {
    labels: MetricLabels;
    value: number;
}

export interface CollectedMetric {
    name: string;
    help: string;
    type: 'counter' | 'gauge';
    samples: NumericMetricSample[];
}

export interface Counter {
    inc(value?: number, labels?: MetricLabels): void;
}

export interface ImpactMetricRegistry {
    counter(opts: { name: string; help: string }): Counter;
    getCounter(name: string): Counter | undefined;
    collect(): CollectedMetric[];
}

class CounterImpl implements Counter {
    private values = new Map<string, number>();

    constructor(private opts: { name: string; help: string }) {}

    inc(value?: number, labels?: MetricLabels): void {
        const delta = value ?? 1;
        if (delta <= 0) return;
        const key = labels ? JSON.stringify(labels) : '';
        const current = this.values.get(key) ?? 0;
        this.values.set(key, current + delta);
    }

    collect(): CollectedMetric {
        const samples: NumericMetricSample[] = Array.from(
            this.values.entries()
        ).map(([key, value]) => ({
            labels: key ? JSON.parse(key) : {},
            value,
        }));

        this.values.clear();

        return {
            name: this.opts.name,
            help: this.opts.help,
            type: 'counter',
            samples: samples.length > 0 ? samples : [{ labels: {}, value: 0 }],
        };
    }
}

export class InMemoryMetricRegistry implements ImpactMetricRegistry {
    private counters = new Map<string, CounterImpl>();

    counter(opts: { name: string; help: string }): Counter {
        let counter = this.counters.get(opts.name);
        if (!counter) {
            counter = new CounterImpl(opts);
            this.counters.set(opts.name, counter);
        }
        return counter;
    }

    getCounter(name: string): Counter | undefined {
        return this.counters.get(name);
    }

    collect(): CollectedMetric[] {
        return Array.from(this.counters.values()).map((c) => c.collect());
    }
}

export class MetricsAPI {
    constructor(
        private metricRegistry: ImpactMetricRegistry,
        private appName: string
    ) {}

    defineCounter(name: string, help: string): void {
        if (!name || !help) {
            console.warn(
                `Counter name or help cannot be empty: ${name}, ${help}`
            );
            return;
        }
        this.metricRegistry.counter({ name, help });
    }

    incrementCounter(
        name: string,
        value?: number,
        labels?: MetricLabels
    ): void {
        const counter = this.metricRegistry.getCounter(name);
        if (!counter) {
            console.warn(`Counter ${name} not defined`);
            return;
        }

        const mergedLabels = {
            appName: this.appName,
            ...labels,
        };

        counter.inc(value, mergedLabels);
    }
}

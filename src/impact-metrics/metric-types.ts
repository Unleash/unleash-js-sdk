function isInvalidValue(value: number | undefined): boolean {
    return value !== undefined && !Number.isFinite(value);
}

type LabelValuesKey = string;

function getLabelKey(labels?: MetricLabels): LabelValuesKey {
    if (!labels) return '';
    return Object.keys(labels)
        .sort()
        .map((k) => `${k}=${labels[k]}`)
        .join(',');
}

function parseLabelKey(key: string): MetricLabels {
    const labels: MetricLabels = {};
    if (!key) return labels;
    for (const pair of key.split(',')) {
        const [k, v] = pair.split('=');
        labels[k] = v;
    }
    return labels;
}

export interface NumericMetricSample {
    labels: MetricLabels;
    value: number;
}

export type MetricSample = NumericMetricSample;

const isNumericMetricSample = (
    sample: MetricSample
): sample is NumericMetricSample => 'value' in sample;

export type CollectedMetric = {
    name: string;
    help: string;
    type: 'counter';
    samples: NumericMetricSample[];
};

interface CollectibleMetric {
    collect(): CollectedMetric;
}

class CounterImpl implements Counter {
    private values = new Map<LabelValuesKey, number>();

    constructor(private opts: MetricOptions) {}

    inc(value?: number, labels?: MetricLabels): void {
        if (isInvalidValue(value)) return;
        const delta = value ?? 1;
        if (delta <= 0) return;
        const key = getLabelKey(labels);
        const current = this.values.get(key) ?? 0;
        this.values.set(key, current + delta);
    }

    collect(): CollectedMetric {
        const samples: NumericMetricSample[] = Array.from(
            this.values.entries()
        ).map(([key, value]) => ({
            labels: parseLabelKey(key),
            value,
        }));

        this.values.clear();

        if (samples.length === 0) {
            samples.push({
                labels: {},
                value: 0,
            });
        }

        return {
            name: this.opts.name,
            help: this.opts.help,
            type: 'counter',
            samples,
        };
    }
}

export type MetricLabels = Record<string, string>;

export interface Counter {
    inc(value?: number, labels?: MetricLabels): void;
}

export interface ImpactMetricsDataSource {
    collect(): CollectedMetric[];
    restore(metrics: CollectedMetric[]): void;
}

export interface ImpactMetricRegistry {
    getCounter(counterName: string): Counter | undefined;
    counter(opts: MetricOptions): Counter;
}

export class InMemoryMetricRegistry
    implements ImpactMetricsDataSource, ImpactMetricRegistry
{
    private counters = new Map<string, Counter & CollectibleMetric>();

    getCounter(counterName: string): Counter | undefined {
        return this.counters.get(counterName);
    }

    counter(opts: MetricOptions): Counter {
        const key = opts.name;
        let counter = this.counters.get(key);
        if (!counter) {
            counter = new CounterImpl(opts);
            this.counters.set(key, counter);
        }
        return counter;
    }

    collect(): CollectedMetric[] {
        const allCounters = Array.from(this.counters.values()).map((c) =>
            c.collect()
        );

        const nonEmpty = allCounters.filter(
            (metric) => metric.samples.length > 0
        );
        return nonEmpty.length > 0 ? nonEmpty : [];
    }

    restore(metrics: CollectedMetric[]): void {
        for (const metric of metrics) {
            const counter = this.counter({
                name: metric.name,
                help: metric.help,
            });
            for (const sample of metric.samples) {
                if (isNumericMetricSample(sample)) {
                    counter.inc(sample.value, sample.labels);
                }
            }
        }
    }
}

export interface MetricOptions {
    name: string;
    help: string;
    labelNames?: string[];
}

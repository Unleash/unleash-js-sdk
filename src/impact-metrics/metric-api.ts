import { TinyEmitter } from 'tiny-emitter';
import type { ImpactMetricRegistry, MetricLabels } from './metric-types';
import { EVENTS } from '../events';

export class MetricsAPI extends TinyEmitter {
    constructor(
        private metricRegistry: ImpactMetricRegistry,
        private appName: string,
        private environment: string
    ) {
        super();
    }

    defineCounter(name: string, help: string) {
        if (!name || !help) {
            this.emit(
                EVENTS.WARN,
                `Counter name or help cannot be empty: ${name}, ${help}.`
            );
            return;
        }
        const labelNames = ['featureName', 'appName', 'environment'];
        this.metricRegistry.counter({ name, help, labelNames });
    }

    defineHistogram(name: string, help: string, buckets?: number[]) {
        if (!name || !help) {
            this.emit(
                EVENTS.WARN,
                `Histogram name or help cannot be empty: ${name}, ${help}.`
            );
            return;
        }
        const labelNames = ['featureName', 'appName', 'environment'];
        this.metricRegistry.histogram({
            name,
            help,
            labelNames,
            buckets: buckets || [],
        });
    }

    incrementCounter(name: string, value?: number): void {
        const counter = this.metricRegistry.getCounter(name);
        if (!counter) {
            this.emit(
                EVENTS.WARN,
                `Counter ${name} not defined, this counter will not be incremented.`
            );
            return;
        }

        const labels: MetricLabels = {
            appName: this.appName,
            environment: this.environment,
        };

        counter.inc(value, labels);
    }

    observeHistogram(name: string, value: number): void {
        const histogram = this.metricRegistry.getHistogram(name);
        if (!histogram) {
            this.emit(
                EVENTS.WARN,
                `Histogram ${name} not defined, this histogram will not be updated.`
            );
            return;
        }

        const labels = {
            appName: this.appName,
            environment: this.environment,
        };

        histogram.observe(value, labels);
    }
}

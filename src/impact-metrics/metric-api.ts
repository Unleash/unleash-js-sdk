import { TinyEmitter } from 'tiny-emitter';
import type { ImpactMetricRegistry, MetricLabels } from './metric-types';
import { EVENTS } from '../events';

export class MetricsAPI extends TinyEmitter {
    constructor(
        private metricRegistry: ImpactMetricRegistry,
        private appName: string
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

    incrementCounter(
        name: string,
        value?: number,
        labels?: MetricLabels
    ): void {
        const counter = this.metricRegistry.getCounter(name);
        if (!counter) {
            this.emit(
                EVENTS.WARN,
                `Counter ${name} not defined, this counter will not be incremented.`
            );
            return;
        }

        const allLabels: MetricLabels = {
            appName: this.appName,
            ...labels,
        };

        counter.inc(value, allLabels);
    }
}

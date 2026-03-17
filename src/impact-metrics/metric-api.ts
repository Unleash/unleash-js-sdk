import { TinyEmitter } from 'tiny-emitter';
import type { ImpactMetricRegistry, MetricLabels } from './metric-types';
import { EVENTS } from '../events';

export class MetricsAPI extends TinyEmitter {
    constructor(
        private metricRegistry: ImpactMetricRegistry,
        private context: { appName: string; environment: string }
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

    incrementCounter(name: string, value?: number): void {
        const counter = this.metricRegistry.getCounter(name);
        if (!counter) {
            this.emit(
                EVENTS.WARN,
                `Counter ${name} not defined, this counter will not be incremented.`
            );
            return;
        }

        const { appName, environment } = this.context;

        const labels: MetricLabels = {
            appName,
            environment,
        };

        counter.inc(value, labels);
    }
}

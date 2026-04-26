import { IContext } from '.';
import { uuidv4 } from './uuidv4';

class EventsHandler {
    private generateEventId() {
        return uuidv4();
    }

    public createImpressionEvent(
        context: IContext,
        enabled: boolean,
        featureName: string,
        eventType: string,
        impressionData?: boolean,
        variant?: string
    ) {
        const baseEvent = this.createBaseEvent(
            context,
            enabled,
            featureName,
            eventType,
            impressionData
        );

        if (variant) {
            return {
                ...baseEvent,
                variant,
            };
        }
        return baseEvent;
    }

    private createBaseEvent(
        context: IContext,
        enabled: boolean,
        featureName: string,
        eventType: string,
        impressionData?: boolean
    ) {
        return {
            eventType,
            eventId: this.generateEventId(),
            context,
            enabled,
            featureName,
            impressionData,
        };
    }
}

export default EventsHandler;

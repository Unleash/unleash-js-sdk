import { IContext } from '.';
import { v4 as uuidv4 } from 'uuid';

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

    public createCustomEvent(
        context: IContext,
        eventName: string,
        payload?: Record<string, unknown>
    ) {
        const event: {
            eventType: string;
            eventId: string;
            eventName: string;
            context: IContext;
            payload?: Record<string, unknown>;
        } = {
            eventType: 'custom',
            eventId: this.generateEventId(),
            eventName,
            context,
        };
        if (payload !== undefined) {
            event.payload = payload;
        }
        return event;
    }
}

export default EventsHandler;

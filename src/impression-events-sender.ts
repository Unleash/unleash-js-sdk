import { parseHeaders } from './util';

export interface ImpressionEventsSenderOptions {
    onError: (error: unknown) => void;
    appName: string;
    disabled?: boolean;
    url: URL | string;
    clientKey: string;
    fetch: any;
    headerName: string;
    customHeaders?: Record<string, string>;
    connectionId: string;
}

export default class ImpressionEventsSender {
    private onError: (error: unknown) => void;
    private appName: string;
    private disabled: boolean;
    private url: URL;
    private clientKey: string;
    private fetch: any;
    private headerName: string;
    private customHeaders: Record<string, string>;
    private connectionId: string;

    constructor({
        onError,
        appName,
        disabled = false,
        url,
        clientKey,
        fetch,
        headerName,
        customHeaders = {},
        connectionId,
    }: ImpressionEventsSenderOptions) {
        this.onError = onError;
        this.disabled = disabled;
        this.appName = appName;
        this.url = url instanceof URL ? url : new URL(url);
        this.clientKey = clientKey;
        this.fetch = fetch;
        this.headerName = headerName;
        this.customHeaders = customHeaders;
        this.connectionId = connectionId;
    }

    private getHeaders() {
        return parseHeaders({
            clientKey: this.clientKey,
            appName: this.appName,
            connectionId: this.connectionId,
            customHeaders: this.customHeaders,
            headerName: this.headerName,
            isPost: true,
        });
    }

    public async send(event: unknown): Promise<void> {
        if (this.disabled) {
            return;
        }

        const url = `${this.url}/client/events`;

        try {
            console.log('Unleash: POST', url, event);
            await this.fetch(url, {
                cache: 'no-cache',
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(event),
                keepalive: true,
            });
        } catch (e) {
            console.error('Unleash: unable to send impression event', e);
            this.onError(e);
        }
    }
}

import { InMemoryStorageProvider, UnleashClient } from './index';
import type { IConfig } from './index';

const clients: UnleashClient[] = [];
const response = () => new Response(JSON.stringify({ toggles: [] }));

function createClient(config: Partial<IConfig> = {}) {
    const requests: string[] = [];
    const client = new UnleashClient({
        url: 'http://localhost/frontend',
        clientKey: 'test',
        appName: 'lifecycle-test',
        storageProvider: new InMemoryStorageProvider(),
        refreshInterval: 1,
        disableMetrics: true,
        metricsInterval: 1,
        ...config,
        fetch: async (url: string, options: RequestInit) => {
            requests.push(url);
            return config.fetch ? config.fetch(url, options) : response();
        },
    });
    clients.push(client);
    return { client, requests };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
    jest.restoreAllMocks();
    for (const client of clients.splice(0)) client.stop();
    jest.clearAllTimers();
    jest.useRealTimers();
});

test.each([false, true])(
    'cleans up timers after overlapping starts when disableRefresh is %s',
    async (disableRefresh) => {
        const pending: ((value: Response) => void)[] = [];
        const { client, requests } = createClient({
            disableRefresh,
            disableMetrics: false,
            fetch: () =>
                pending.length < 2
                    ? new Promise<Response>((resolve) => pending.push(resolve))
                    : response(),
        });
        const first = client.start();
        const second = client.start();
        await jest.advanceTimersByTimeAsync(0);
        expect(pending).toHaveLength(2);

        for (const complete of pending) complete(response());
        await Promise.all([first, second]);
        expect(jest.getTimerCount()).toBe(disableRefresh ? 1 : 2);
        client.stop();
        expect(jest.getTimerCount()).toBe(0);
        await jest.advanceTimersByTimeAsync(3000);
        expect(requests).toHaveLength(2);
    }
);

test('finishes initialization without restarting timers after shutdown', async () => {
    const { client, requests } = createClient({ disableMetrics: false });

    const starting = client.start();
    client.stop();
    await starting;
    client.isEnabled('example');
    await jest.advanceTimersByTimeAsync(3000);

    expect(client.isReady()).toBe(true);
    expect(requests).toHaveLength(1);
});

test('finishes an already queued context update when readiness arrives after shutdown', async () => {
    const { client, requests } = createClient();
    const starting = client.start();
    const updating = client.updateContext({ userId: 'example-user' });

    client.stop();
    await Promise.all([starting, updating]);

    expect(client.getContext().userId).toBe('example-user');
    expect(client.isReady()).toBe(true);
    expect(requests).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(3000);
    expect(requests).toHaveLength(2);
});

test('only starts current timers when restarted during initialization', async () => {
    const { client, requests } = createClient();
    const first = client.start();
    client.stop();

    const second = client.start();
    await Promise.all([first, second]);
    expect(requests).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(1000);
    expect(requests).toHaveLength(3);

    client.stop();
    await jest.advanceTimersByTimeAsync(3000);
    expect(requests).toHaveLength(3);
});

test('stays stopped when the initial fetch finishes after shutdown', async () => {
    let complete!: (value: Response) => void;
    const { client, requests } = createClient({
        fetch: () => new Promise<Response>((resolve) => (complete = resolve)),
    });
    const starting = client.start();
    await jest.advanceTimersByTimeAsync(0);

    client.stop();
    complete(response());
    await starting;
    await jest.advanceTimersByTimeAsync(3000);

    expect(requests).toHaveLength(1);
});

test.each([false, true])(
    'keeps a restarted client running when the older startup finishes first: %s',
    async (olderFirst) => {
        const pending: ((value: Response) => void)[] = [];
        const { client, requests } = createClient({
            fetch: () =>
                pending.length < 2
                    ? new Promise<Response>((resolve) => pending.push(resolve))
                    : response(),
        });
        const first = client.start();
        await jest.advanceTimersByTimeAsync(0);
        client.stop();
        const second = client.start();
        await jest.advanceTimersByTimeAsync(0);

        if (olderFirst) {
            pending[0](response());
            await first;
            pending[1](response());
            await second;
        } else {
            pending[1](response());
            await second;
            pending[0](response());
            await first;
        }
        await jest.advanceTimersByTimeAsync(1000);
        expect(requests).toHaveLength(3);

        client.stop();
        await jest.advanceTimersByTimeAsync(3000);
        expect(requests).toHaveLength(3);
    }
);

test('honors shutdown from a ready listener', async () => {
    const { client, requests } = createClient();
    client.on('ready', () => client.stop());

    await client.start();
    await jest.advanceTimersByTimeAsync(3000);

    expect(requests).toHaveLength(1);
});

test('cancels the delayed first metrics report on shutdown', async () => {
    const { client, requests } = createClient({ disableMetrics: false });
    await client.start();
    client.isEnabled('example');

    const beforeStop = [...requests];
    client.stop();
    await jest.advanceTimersByTimeAsync(4000);

    expect(requests).toEqual(beforeStop);
});

test('uses the new metrics delay after restarting', async () => {
    const { client, requests } = createClient({
        disableMetrics: false,
        disableRefresh: true,
    });
    await client.start();
    client.stop();
    await jest.advanceTimersByTimeAsync(1000);
    await client.start();
    client.isEnabled('example');

    await jest.advanceTimersByTimeAsync(1000);
    expect(requests.filter((url) => url.endsWith('/client/metrics'))).toEqual(
        []
    );

    await jest.advanceTimersByTimeAsync(1000);
    expect(
        requests.filter((url) => url.endsWith('/client/metrics'))
    ).toHaveLength(1);
    client.stop();
    client.isEnabled('example');
    const count = requests.length;
    await jest.advanceTimersByTimeAsync(3000);
    expect(requests).toHaveLength(count);
});

test.each([{ disableRefresh: true }, { refreshInterval: 0 }])(
    'refreshes flags on sequential starts with %j',
    async (config) => {
        let enabled = false;
        const { client } = createClient({
            ...config,
            fetch: async () =>
                new Response(
                    JSON.stringify({
                        toggles: [
                            {
                                name: 'example',
                                enabled,
                                impressionData: false,
                                variant: { name: 'disabled', enabled: false },
                            },
                        ],
                    })
                ),
        });
        await client.start();
        expect(client.isEnabled('example')).toBe(false);

        enabled = true;
        await client.start();

        expect(client.isEnabled('example')).toBe(true);
    }
);

test('preserves one metrics schedule across sequential starts', async () => {
    const { client, requests } = createClient({
        disableRefresh: true,
        disableMetrics: false,
    });
    await client.start();
    client.isEnabled('example');
    await jest.advanceTimersByTimeAsync(1000);

    await client.start();
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect(
        requests.filter((url) => url.endsWith('/client/metrics'))
    ).toHaveLength(1);

    await client.start();
    expect(jest.getTimerCount()).toBe(1);
    client.stop();
    expect(jest.getTimerCount()).toBe(0);
});

test('removes the page-hidden metrics listener after sequential starts', async () => {
    const { client, requests } = createClient({
        disableRefresh: true,
        disableMetrics: false,
        metricsInterval: 0,
    });
    await client.start();
    await client.start();
    client.stop();
    client.isEnabled('example');
    const count = requests.length;
    const visibility = Object.getOwnPropertyDescriptor(
        document,
        'visibilityState'
    );

    try {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(requests).toHaveLength(count);
    } finally {
        if (visibility)
            Object.defineProperty(document, 'visibilityState', visibility);
        else Reflect.deleteProperty(document, 'visibilityState');
    }
});

test('keeps context updates pending until readiness after a failed initial fetch', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let online = false;
    let updateFinished = false;
    const { client, requests } = createClient({
        fetch: async () =>
            new Response(JSON.stringify({ toggles: [] }), {
                status: online ? 200 : 503,
            }),
    });
    const starting = client.start();
    const update = async () => {
        await client.updateContext({ userId: 'example-user' });
        updateFinished = true;
    };
    const updating = update();
    await starting;
    await jest.advanceTimersByTimeAsync(0);

    expect(client.isReady()).toBe(false);
    expect(updateFinished).toBe(false);
    expect(requests).toHaveLength(1);

    online = true;
    await jest.advanceTimersByTimeAsync(1000);
    await updating;
    expect(client.isReady()).toBe(true);
    expect(updateFinished).toBe(true);
});

test('uses bootstrap readiness without waiting for startup to finish', async () => {
    let complete!: (value: Response) => void;
    let fetches = 0;
    let startFinished = false;
    let updateFinished = false;
    const { client } = createClient({
        bootstrap: [
            {
                name: 'example',
                enabled: true,
                impressionData: false,
                variant: { name: 'disabled', enabled: false },
            },
        ],
        fetch: () =>
            ++fetches === 1
                ? response()
                : new Promise<Response>((resolve) => (complete = resolve)),
    });
    const start = async () => {
        await client.start();
        startFinished = true;
    };
    const update = async () => {
        await client.updateContext({ userId: 'example-user' });
        updateFinished = true;
    };
    const starting = start();
    const updating = update();
    await jest.advanceTimersByTimeAsync(0);

    expect(client.isReady()).toBe(true);
    expect(updateFinished).toBe(true);
    expect(startFinished).toBe(false);

    complete(response());
    await Promise.all([starting, updating]);
});

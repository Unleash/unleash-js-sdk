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
    for (const client of clients.splice(0)) client.stop();
    jest.clearAllTimers();
    jest.useRealTimers();
});

test.each([false, true])(
    'shares pending startup when disableRefresh is %s',
    async (disableRefresh) => {
        let complete!: (value: Response) => void;
        const { client, requests } = createClient({
            disableRefresh,
            fetch: () =>
                new Promise<Response>((resolve) => (complete = resolve)),
        });

        const first = client.start();
        const second = client.start();
        await jest.advanceTimersByTimeAsync(0);

        expect(requests).toHaveLength(1);
        complete(response());
        await Promise.all([first, second]);
        client.stop();
        await jest.advanceTimersByTimeAsync(3000);
        expect(requests).toHaveLength(1);
    }
);

test('stays stopped when initialization finishes after shutdown', async () => {
    const { client, requests } = createClient({ disableMetrics: false });

    const starting = client.start();
    client.stop();
    await starting;
    client.isEnabled('example');
    await jest.advanceTimersByTimeAsync(3000);

    expect(requests).toEqual([]);
});

test('finishes a context update when shutdown cancels its pending startup', async () => {
    const { client, requests } = createClient();
    const starting = client.start();
    const updating = client.updateContext({ userId: 'example-user' });

    client.stop();
    await Promise.all([starting, updating]);

    expect(client.getContext().userId).toBe('example-user');
    expect(requests).toEqual([]);
});

test('starts only the latest lifecycle when restarted during initialization', async () => {
    const { client, requests } = createClient();
    const first = client.start();
    client.stop();

    const second = client.start();
    await Promise.all([first, second]);
    expect(requests).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect(requests).toHaveLength(2);

    client.stop();
    await jest.advanceTimersByTimeAsync(3000);
    expect(requests).toHaveLength(2);
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

test('keeps a restarted client running when an older startup finishes', async () => {
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

    pending[1](response());
    await second;
    pending[0](response());
    await first;
    await jest.advanceTimersByTimeAsync(1000);
    expect(requests).toHaveLength(3);

    client.stop();
    await jest.advanceTimersByTimeAsync(3000);
    expect(requests).toHaveLength(3);
});

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

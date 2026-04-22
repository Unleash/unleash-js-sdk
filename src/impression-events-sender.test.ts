import { FetchMock } from 'jest-fetch-mock';
import ImpressionEventsSender from './impression-events-sender';
import {
    getTypeSafeRequest,
    getTypeSafeRequestUrl,
    parseRequestBodyWithType,
} from './test';

const fetchMock = fetch as FetchMock;

afterEach(() => {
    fetchMock.resetMocks();
});

const exampleEvent = {
    eventType: 'isEnabled',
    eventId: 'event-id-1',
    context: { appName: 'test', environment: 'default' },
    enabled: true,
    featureName: 'foo',
    impressionData: true,
};

test('does not POST when disabled', async () => {
    const sender = new ImpressionEventsSender({
        onError: console.error,
        appName: 'test',
        disabled: true,
        url: 'http://localhost:3000/api',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        connectionId: 'conn-1',
    });

    await sender.send(exampleEvent);

    expect(fetchMock.mock.calls.length).toEqual(0);
});

test('POSTs event to /client/events with correct url, method, headers and body', async () => {
    const sender = new ImpressionEventsSender({
        onError: console.error,
        appName: 'test',
        url: 'http://localhost:3000/api',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        connectionId: 'conn-1',
    });

    await sender.send(exampleEvent);

    expect(fetchMock.mock.calls.length).toEqual(1);

    const url = getTypeSafeRequestUrl(fetchMock);
    expect(url).toEqual('http://localhost:3000/api/client/events');

    const request = getTypeSafeRequest(fetchMock);
    expect(request.method).toEqual('POST');
    expect(request.headers).toMatchObject({
        authorization: '123',
        'content-type': 'application/json',
        'unleash-appname': 'test',
        'unleash-connection-id': 'conn-1',
    });

    const body = parseRequestBodyWithType<typeof exampleEvent>(request);
    expect(body).toEqual(exampleEvent);
});

test('honors custom auth header name', async () => {
    const sender = new ImpressionEventsSender({
        onError: console.error,
        appName: 'test',
        url: 'http://localhost:3000/api',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'NotAuthorization',
        connectionId: 'conn-1',
    });

    await sender.send(exampleEvent);

    const request = getTypeSafeRequest(fetchMock);
    expect(request.headers).toMatchObject({ notauthorization: '123' });
});

test('calls onError when fetch rejects', async () => {
    const onError = jest.fn();
    const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

    fetchMock.mockRejectOnce(new Error('network down'));

    const sender = new ImpressionEventsSender({
        onError,
        appName: 'test',
        url: 'http://localhost:3000/api',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
        connectionId: 'conn-1',
    });

    await sender.send(exampleEvent);

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toEqual('network down');

    errorSpy.mockRestore();
});

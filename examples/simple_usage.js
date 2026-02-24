import { UnleashClient, InMemoryStorageProvider } from 'unleash-proxy-client';

const client = new UnleashClient({
    url: process.env.UNLEASH_URL, // e.g., 'https://app.unleash-hosted.com/demo/api/frontend
    clientKey: process.env.UNLEASH_CLIENT_KEY,  // a valid Unleash frontend client key: https://docs.getunleash.io/concepts/api-tokens-and-client-keys#frontend-tokens
    appName: 'simple-usage-example',
    storageProvider: new InMemoryStorageProvider(),
    refreshInterval: 15,
    metricsInterval: 30,
    context: {
        userId: 'demo-user-123',
    },
});

const featureName = 'my-feature';

client.on('error', (error) => {
    console.error('Unleash client error:', error);
});

client.on('ready', () => {
    const enabled = client.isEnabled(featureName);
    const variant = client.getVariant(featureName);

    console.log(`Feature "${featureName}" enabled:`, enabled);
    console.log(`Feature "${featureName}" variant:`, variant);
});

client.on('update', () => {
    console.log('Received updated toggles from Unleash.');
});

await client.start();

await client.updateContext({ userId: 'demo-user-456' });

const enabled = client.isEnabled(featureName);
console.log(`Feature "${featureName}" enabled after context update:`, enabled);

process.on('SIGINT', () => {
    client.stop();
    process.exit(0);
});

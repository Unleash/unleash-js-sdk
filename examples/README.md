## Examples

- [`simple_usage.js`](./simple_usage.js): Minimal end-to-end setup using `UnleashClient`.
- Additional examples are available in [unleash-sdk-examples](https://github.com/Unleash/unleash-sdk-examples/tree/main/JavaScript).

## Running local examples from this repo

From the repository root:

```bash
yarn install
yarn build
UNLEASH_URL='https://<your-unleash-instance>/api/frontend' \
UNLEASH_CLIENT_KEY='<your-client-side-token>' \
node examples/simple_usage.js
```


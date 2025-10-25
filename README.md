# MivaBDN SDK

MivaBDN SDK makes it easy to embed the Miva BDN iframe into your web application. It handles iframe creation, secure postMessage communication, and event routing between your host application and the embedded iframe.

## Installation

```bash
npm install @dsr4ai/miva-bdn-sdk
```

## Getting Started

### Using with ES Modules

To get started with ES Modules, simply import the module and use it in your code:

```js
import MivaBDN from '@dsr4ai/miva-bdn-sdk';
```

### Using with UMD Modules

Alternatively, if you're using UMD modules, include the script in your HTML file and use it in your code:

```html
<script src="https://unpkg.com/@dsr4ai/miva-bdn-sdk/dist/index.umd.js"></script>
```

After importing, you can initialize and use the SDK as follows:

```js
const miva = new MivaBDN({
  appId: 'your-app-id',
  target: '#app', // Specifies the DOM element or CSS selector for mounting the iframe
  debug: true, // Enables verbose logging for debugging
});

// Initializes the MivaBDN instance
miva.init();

// Destroys the MivaBDN instance and removes the iframe when no longer needed
// miva.destroy();
```

## API

### `new MivaBDN(options: MivaBDNOptions)`

Creates a new MivaBDN instance.

#### Options

Property | Type | Description
---|---|---
`appId` | `string` | The unique application identifier.
`baseUrl` | `string` | The base URL for the MivaBDN application to be loaded in the iframe.
`debug` | `boolean` | Enables verbose logging to the console for debugging.
`onConfirmed` | `(data: unknown, instance: MivaBDN) => void` | Callback function triggered when the iframe application signals a `confirmed` event.
`onReady` | `(data: unknown, instance: MivaBDN) => void` | Callback function triggered when the iframe application signals a `ready` event.
`target` | `HTMLElement \| string` | The DOM element or CSS selector string identifying where the MivaBDN iframe will be mounted.

### Methods

- `init(): void`
  Initializes the `MivaBDN` instance, creates the iframe, and starts listening for messages.

- `destroy(): void`
  Cleans up the  `MivaBDN` instance by removing the iframe and event listeners.

## Error Handling

All critical errors, such as missing required options or invalid targets, are thrown as instances of `MivaBDNError`.

## Security

The SDK verifies the origin of all incoming messages to ensure only messages from the trusted iframe are processed. Messages from untrusted sources are ignored.

## License

MIT

# MivaBDN SDK

MivaBDN SDK provides an easy way to embed the **Miva BDN iframe** in a web application.

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

Alternatively, if you're using UMD modules, include the script in your HTML file:

```html
<script src="https://unpkg.com/@dsr4ai/miva-bdn-sdk/dist/index.umd.js"></script>
```

After importing, you can initialize and use the SDK as follows:

```js
const miva = new MivaBDN({
  appId: 'your-app-id', // your Miva BDN app ID
  target: '#app',       // container selector
  debug: true           // optional debug mode
});

// Initializes the iframe and starts message listening
miva.init();

// Removes the iframe and event listeners when no longer needed
// miva.destroy();
```

## API

### `new MivaBDN(options: MivaBDNOptions)`

Creates a new `MivaBDN` instance that manages the iframe.

#### Options

Property | Type | Description
---|---|---
`appId` | `string` | Unique application identifier.
`baseUrl` | `string` | Base URL of the Miva BDN loaded in the iframe.
`debug` | `boolean` | Enables verbose logging.
`onConfirmed` | `(data: unknown, instance: MivaBDN) => void` | Called when the iframe signals a `confirmed` event.
`onReady` | `(data: unknown, instance: MivaBDN) => void` | Called when the iframe signals a `ready` event.
`target` | `HTMLElement \| string` | DOM element or CSS selector where the iframe is mounted.

### Methods

- `init(): void`  
  Initializes the iframe and starts message listening.

- `destroy(): void`  
  Removes the iframe and event listeners when no longer needed.

## Error Handling

All critical errors, such as missing required options or invalid targets, are thrown as instances of `MivaBDNError`.

## Security

The SDK verifies the origin of all incoming messages to ensure only messages from the trusted iframe are processed. Messages from untrusted sources are ignored.

## License

MIT

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
const mivaBDN = new MivaBDN({
  appId: 'your-app-id', // your Miva BDN app ID
  target: '#app',       // container selector
  debug: true,          // optional debug mode
  locale: 'ja',         // optional locale
});

// Initializes the iframe and starts message listening
mivaBDN.init();

// Removes the iframe and event listeners when no longer needed
// mivaBDN.destroy();
```

### Manual Integration

For manual integration, refer to the implementation in [`src/manual.js`](src/manual.js).

## Usage

### Loading a Single Book

You can load a single book in the Miva BDN iframe by specifying the `path` and `sourceId` when initializing the `MivaBDN` instance.

```js
const mivaBDN = new MivaBDN({
  appId: 'your-app-id',  // your Miva BDN app ID
  target: '#app',        // container selector
  debug: true,           // optional debug mode
  locale: 'ja',          // optional locale
  path: '/library',      // Path inside the iframe to load the book
  sourceId: 'source-id', // ID of the book to load
});

// Initializes the iframe and starts message listening
mivaBDN.init();
```

## Analytics Tracking

### Default Behavior

The SDK does not send any data to Miva's analytics services by default. The `enableOfficialTracking` option is set to `false` by default. Events are forwarded to your page's `dataLayer` with a `miva.` prefix, allowing you to track them with your own analytics tools if desired.

### Enabling Official Tracking

We recommend enabling official tracking to help us improve the application for everyone.

When you set `enableOfficialTracking` to `true`, you help Miva understand how users interact with the content, allowing us to:

- Optimize reading experience and performance
- Identify and fix issues faster
- Prioritize features that users actually need
- Improve content recommendations

**Privacy protection:**

- Only iframe events are sent to Miva with a `miva.` prefix
- Your page's own analytics events stay private
- Events get namespace isolation to prevent data pollution

```js
const mivaBDN = new MivaBDN({
  appId: 'your-app-id',
  target: '#app',
  enableOfficialTracking: true,
});
```

**Important:** Review your privacy policy and obtain necessary user consent before enabling this option.

### Tracking with Your Own GTM

The SDK forwards all iframe events to `dataLayer` with a `miva.` prefix. If you have your own GTM loaded on the page, configure triggers to listen for `miva.*` events (e.g., Custom Event trigger with regex `^miva\..*`).

## API

### `new MivaBDN(options: MivaBDNOptions)`

Creates a new `MivaBDN` instance that manages the iframe.

#### Options

Property | Type | Description
--- | --- | ---
`appId` | `string` | Unique application identifier.
`baseUrl` | `string` | Base URL of the Miva BDN loaded in the iframe. Default: `https://miva.bookai.com`.
`debug` | `boolean` | Enables verbose logging.
`enableOfficialTracking` | `boolean` | Controls whether to send usage data to Miva's official GTM. Only iframe events are sent to Miva (with `miva.` prefix isolation). Your page's events stay private. Default: `false`.
`locale` | `string` | Locale passed to the Miva application.
`onConfirmed` | `(data: unknown, instance: MivaBDN) => void` | Called when the iframe signals a `confirmed` event.
`onReady` | `(data: unknown, instance: MivaBDN) => void` | Called when the iframe signals a `ready` event.
`path` | `string` | The relative path to be appended to baseUrl when constructing the iframe URL. Should not include protocol or hostname.
`sourceId` | `string \| string[]` | The identifier(s) provided to the Miva application as content source metadata. Can be a single ID string or an array for multiple sources.
`sourceScope` | `SourceScope` | Controls which source scopes are loaded by the Miva application. Options: `public`, `private`, `all`.
`target` | `HTMLElement \| string` | DOM element or CSS selector where the iframe is mounted.

### Methods

- `init(): void`  
  Initializes the iframe and starts message listening.

- `destroy(): void`  
  Removes the iframe and event listeners when no longer needed.

## Error Handling

All critical errors, such as missing required options or invalid targets, are thrown as instances of `MivaBDNError`.

## Security

The SDK implements multiple security measures:

1. **Origin Verification**: All incoming `postMessage` events are verified against the trusted iframe origin. Messages from untrusted sources are ignored.

2. **Event Namespace Isolation**: GTM events from iframe are automatically prefixed with `miva.` to prevent accidental processing by your GTM triggers.

## License

MIT

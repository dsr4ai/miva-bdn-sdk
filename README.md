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

## Single Sign-On (SSO)

If your users are already authenticated in your own system, you can sign them
into the embedded Miva application automatically by passing a partner-signed
`token`. When a `token` is present the app skips anonymous sign-in and exchanges
the token for a session.

```js
const mivaBDN = new MivaBDN({
  appId: 'your-app-id',
  target: '#app',
  token: '<signed-jwt-from-your-backend>', // short-lived, single-use RS256 JWT
  onError: (error) => {
    // Fired if the token is expired, replayed, or invalid.
    // `error` is a MivaBDNError; check `error.code` for the reason.
    console.error('Miva SSO failed:', error.code, error.message);
  },
});

mivaBDN.init();
```

Notes:

- The `token` is delivered to the iframe over `postMessage`; it is never placed
  in the iframe URL.
- Generate the token on your **backend** and keep it short-lived (a few minutes)
  and single-use. Contact Miva to register your issuer's public key and receive
  your `appId` and the expected `aud` value.

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
`onError` | `(error: MivaBDNError, instance: MivaBDN) => void` | Called when the iframe signals an `error` event (e.g. an expired, replayed, or invalid SSO `token`). Receives a `MivaBDNError`; inspect `error.code` for the reason.
`onReady` | `(data: unknown, instance: MivaBDN) => void` | Called when the iframe signals a `ready` event.
`path` | `string` | The relative path to be appended to baseUrl when constructing the iframe URL. Should not include protocol or hostname.
`sourceId` | `string \| string[]` | The identifier(s) provided to the Miva application as content source metadata. Can be a single ID string or an array for multiple sources.
`target` | `HTMLElement \| string` | DOM element or CSS selector where the iframe is mounted.
`token` | `string` | A partner-signed SSO token (JWT). When provided, the embedded app exchanges it for a session instead of signing in anonymously. Delivered to the iframe over `postMessage` (never placed in the URL). See [Single Sign-On](#single-sign-on-sso).

### Methods

- `init(): void`  
  Initializes the iframe and starts message listening.

- `destroy(): void`  
  Removes the iframe and event listeners when no longer needed.

## Error Handling

Setup errors — such as missing required options or an invalid target — are thrown synchronously from `init()` (not the constructor), so a single `try/catch` around `init()` covers them:

```js
try {
  new MivaBDN({ appId, target }).init();
} catch (error) {
  // error is a MivaBDNError; check error.code (e.g. 'missing_app_id').
}
```

Runtime errors reported by the embedded application (e.g. SSO failures) are delivered asynchronously to [`onError`](#single-sign-on-sso). Both channels deliver a `MivaBDNError` carrying an optional `code`.

## Security

The SDK implements multiple security measures:

1. **Origin Verification**: All incoming `postMessage` events are verified against the trusted iframe origin. Messages from untrusted sources are ignored.

2. **Event Namespace Isolation**: GTM events from iframe are automatically prefixed with `miva.` to prevent accidental processing by your GTM triggers.

## License

MIT

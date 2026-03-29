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
  appId: 'your-app-id',    // your Miva BDN app ID
  target: '#app',          // container selector
  debug: true,             // optional debug mode
  locale: 'ja',            // optional locale
  path: '/library',        // Path inside the iframe to load the book
  sourceId: 'source-id', // ID of the book to load
});

// Initializes the iframe and starts message listening
mivaBDN.init();
```

## Analytics Tracking

### Default Behavior

By default, the SDK **does not** send any data to Miva's analytics services. All tracking is opt-in and requires explicit consent.

### Enabling Official Tracking (Opt-in)

⚠️ **Important Data Sharing Notice**: When you enable `enableOfficialTracking: true`, the SDK will load Miva's Google Analytics and Google Tag Manager on your main page.

**How it works to protect your privacy:**

- **Google Analytics (GA)**: Miva's official GA is loaded **without configuration** - it won't receive your page's events. Only iframe events use `send_to` parameter to target Miva's GA.
- **Google Tag Manager (GTM)**: Events from iframe get `miva.` prefix (e.g., `button_click` → `miva.button_click`). Configure your GTM triggers to exclude `miva.*` events for complete isolation.
- Your page's own analytics events will **only** go to your configured destinations
- This prevents data pollution and protects your user's privacy

**What Miva receives:**

- User interactions **inside the iframe only** (e.g., book reading, page turns)
- Traffic source information (your domain, referrer)
- Technical metrics from iframe usage

**What Miva does NOT receive:**

- Analytics events from your page outside the iframe
- Your own business metrics or custom events
- User data collected by your own tracking

**You should still:**

1. Review your privacy policy to ensure it covers this data sharing
2. Obtain necessary consent from your users (GDPR/CCPA compliance)
3. Confirm this data sharing is acceptable for your use case

To enable official tracking:

```js
const mivaBDN = new MivaBDN({
  appId: 'your-app-id',
  target: '#app',
  enableOfficialTracking: true, // Explicitly opt-in to share analytics with Miva
});
```

### Adding Custom Analytics

You can add your own Google Analytics or Google Tag Manager tracking alongside Miva's official tracking:

```js
const mivaBDN = new MivaBDN({
  appId: 'your-app-id',
  target: '#app',
  gaId: 'G-XXXXXXXXXX',              // Your Google Analytics ID
  gtmId: 'GTM-XXXXXXX',               // Your Google Tag Manager ID
  enableOfficialTracking: true,      // Share analytics with Miva (recommended)
});
```

Both parameters (`gaId` and `gtmId`) accept either a single ID string or an array of IDs for multiple tracking containers.

### Forwarding Events from Iframe

The SDK automatically listens for analytics events sent from the iframe and forwards them to the parent window's `dataLayer`. This allows you to track user interactions inside the iframe.

#### Event Isolation Mechanism

To prevent data pollution between your analytics and Miva's:

**For Google Analytics (GA)**:

- Events from iframe automatically get `send_to` parameter pointing to official GA
- Your page's GA events only go to your GA ID
- ✓ Complete isolation

**For Google Tag Manager (GTM)**:

- Events from iframe get `miva.` prefix added to the event name
- Example: `button_click` → `miva.button_click`
- Configure your GTM triggers to exclude `miva.*` events
- Configure Miva's GTM triggers to only include `miva.*` events
- ✓ Namespace-based isolation

## API

### `new MivaBDN(options: MivaBDNOptions)`

Creates a new `MivaBDN` instance that manages the iframe.

#### Options

Property | Type | Description
--- | --- | ---
`appId` | `string` | Unique application identifier.
`baseUrl` | `string` | Base URL of the Miva BDN loaded in the iframe. Default: `https://miva.bookai.com`.
`debug` | `boolean` | Enables verbose logging.
`enableOfficialTracking` | `boolean` | Controls whether to send usage data to Miva's official analytics. Only iframe events are sent to Miva (with isolation). Your page's events stay private. Default: `false`.
`gaId` | `string \| string[]` | Additional Google Analytics tracking ID(s). Official Miva GA is added automatically unless `enableOfficialTracking` is false.
`gtmId` | `string \| string[]` | Additional Google Tag Manager container ID(s). Official Miva GTM is added automatically unless `enableOfficialTracking` is false. Events from iframe are prefixed with `miva.` for isolation.
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

3. **GA Send-To Isolation**: Google Analytics events from iframe use explicit `send_to` parameter to prevent data pollution.

## License

MIT

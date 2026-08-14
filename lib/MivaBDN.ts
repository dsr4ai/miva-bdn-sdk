/* eslint-disable no-console */
import {
  AnalyticsConfig,
  Origin,
} from './enums';
import MivaBDNError from './MivaBDNError';

/**
 * Configuration options for the MivaBDN instance.
 */
export interface MivaBDNOptions {
  /**
   * The unique application identifier.
   */
  appId: string;

  /**
   * A partner-signed SSO token (JWT) that authenticates the current user.
   *
   * When provided, the embedded Miva application exchanges this token for a
   * session instead of signing in anonymously. The token is delivered to the
   * iframe over `postMessage` (never placed in the iframe URL). Generate it
   * short-lived and single-use on your backend.
   */
  token?: string;

  /**
   * The base URL for the MivaBDN application to be loaded in the iframe.
   */
  baseUrl?: string;

  /**
   * Enables verbose logging to the console for debugging.
   * @default false
   */
  debug?: boolean;

  /**
   * Callback function triggered when the iframe application signals a `confirmed` event.
   * @param data - The event data payload from the iframe.
   * @param instance - The MivaBDN class instance.
   */
  onConfirmed?: (data: unknown, instance: MivaBDN) => void;

  /**
   * Callback function triggered when the iframe application signals a `ready` event.
   * @param data - The event data payload from the iframe.
   * @param instance - The MivaBDN class instance.
   */
  onReady?: (data: unknown, instance: MivaBDN) => void;

  /**
   * Callback function triggered when the iframe application signals an `error`
   * event, e.g. an SSO token that is expired, replayed, or invalid.
   *
   * Receives a {@link MivaBDNError} — the same error type thrown synchronously
   * for setup errors — so both error channels share one shape. Inspect
   * `error.code` for the machine-readable reason.
   * @param error - The normalized error.
   * @param instance - The MivaBDN class instance.
   */
  onError?: (error: MivaBDNError, instance: MivaBDN) => void;

  /**
   * The relative path to be appended to `baseUrl` when constructing the iframe URL.
   * This value should not include protocol or hostname.
   */
  path?: string;

  /**
   * The identifier(s) provided to the Miva application as content source metadata.
   * Can be a single ID string or an array for multiple sources.
   */
  sourceId?: string | string[];

  /**
   * The DOM element or CSS selector string identifying where the
   * MivaBDN iframe will be mounted.
   */
  target: HTMLElement | string;

  /**
   * Locale to be passed to the Miva application.
   */
  locale?: string;

  /**
   * Controls whether to automatically send usage data to Miva's official analytics (GTM).
   * When enabled, Miva's GTM will be loaded and iframe events get `miva.` prefix for namespace isolation.
   * Your page's own analytics events remain isolated and private.
   * @default false
   */
  enableOfficialTracking?: boolean;
}

/**
 * Manages the lifecycle and communication of an embedded MivaBDN iframe.
 *
 * This class handles creating the iframe, establishing a secure postMessage
 * channel, and routing events between the host window and the iframe.
 *
 * @example
 * ```typescript
 * const miva = new MivaBDN({
 *   appId: 'your-app-id',
 *   baseUrl: 'https://miva.bookai.com',
 *   target: '#app',
 * });
 *
 * // Call init() to create the iframe and start communication
 * miva.init();
 * ```
 */
export default class MivaBDN {
  private appId: string = '';
  private baseUrl: string = '';
  private debug: boolean = false;
  private iframeEl: HTMLIFrameElement | null = null;
  private messageHandler: (ev: MessageEvent) => void = () => {};
  private onConfirmed: (data: unknown, instance: MivaBDN) => void = () => {};
  private onError: (error: MivaBDNError, instance: MivaBDN) => void = () => {};
  private onReady: (data: unknown, instance: MivaBDN) => void = () => {};
  private token?: string;
  private tokenSent: boolean = false;
  private origin: string = '';
  private options: MivaBDNOptions;
  private path: string = '';
  private locale?: string;
  private sourceId: string = '';
  private gtmIds: string[] = [];
  private isInitialized: boolean = false;

  /**
   * Creates an instance of MivaBDN.
   * @param options - The configuration options for this instance.
   */
  constructor(options: MivaBDNOptions) {
    // The constructor only stores configuration. All validation and setup
    // happens in init(), so callers have a single place — init() — to catch
    // synchronous setup errors.
    this.options = options;
  }

  /**
   * Initializes the MivaBDN instance.
   * Validates configuration, creates the iframe, and establishes the message listener.
   * This method must be called to start the MivaBDN application.
   *
   * @throws {MivaBDNError} If required options (appId, baseUrl, target) are missing.
   */
  init() {
    if (this.isInitialized) {
      this.printLog('Already initialized, skipping duplicate init() call.');
      return;
    }

    if (!this.options.appId) {
      throw new MivaBDNError('appId is required for initialization.', 'missing_app_id');
    }
    if (!this.options.target) {
      throw new MivaBDNError('target is required for initialization.', 'missing_target');
    }

    this.appId = this.options.appId;
    this.baseUrl = this.resolveBaseUrl(this.options.baseUrl);
    this.debug = this.options.debug ?? false;
    this.messageHandler = this.handleMessage.bind(this);
    this.onConfirmed = this.options.onConfirmed ?? (() => {});
    this.onError = this.options.onError ?? (() => {});
    this.onReady = this.options.onReady ?? (() => {});
    this.token = this.options.token;
    this.origin = new URL(this.baseUrl).origin;
    this.path = this.options.path ?? '';
    this.locale = this.options.locale;
    this.sourceId = this.resolveSourceId(this.options.sourceId);

    this.initializeAnalytics();

    this.iframeEl = this.createIframe(this.resolveTarget(this.options.target));

    window.addEventListener('message', this.messageHandler);

    this.isInitialized = true;
    this.printLog('Initialized iframe and added message listener.');
  }

  /**
   * Cleans up the instance.
   * Removes the window message listener and removes the iframe element from the DOM.
   */
  destroy() {
    window.removeEventListener('message', this.messageHandler);

    if (this.iframeEl && this.iframeEl.parentNode) {
      this.iframeEl.parentNode.removeChild(this.iframeEl);
    }

    this.iframeEl = null;
    this.isInitialized = false;

    this.printLog('Destroyed iframe and removed message listener.');
  }

  /**
   * Sends a message payload to the embedded MivaBDN iframe.
   *
   * @param payload - The data to send to the iframe.
   * @throws {MivaBDNError} If the iframe is not available or not yet initialized.
   */
  postMessage(payload: unknown) {
    if (!this.iframeEl || !this.iframeEl.contentWindow) {
      throw new MivaBDNError('Failed to post message. Iframe is not available.', 'iframe_unavailable');
    }

    this.iframeEl.contentWindow.postMessage(payload, this.origin);

    this.printLog(`Posted message to ${this.origin}:`, payload);
  }

  /**
   * Resolves the provided base URL, validating it against allowed origins.
   * @param url - The base URL to validate and resolve.
   * @returns The resolved base URL.
   * @throws {MivaBDNError} If the URL is not in the list of allowed origins.
   */
  private resolveBaseUrl(url?: string): string {
    if (!url) {
      return Origin.PROD;
    }
    const { origin } = new URL(url);
    if (AnalyticsConfig.ALLOWED_ORIGINS.includes(origin)) {
      return url;
    }
    throw new MivaBDNError(`Invalid baseUrl. Must be one of: ${Origin.PROD}, ${Origin.STAGING}, ${Origin.DEV}`, 'invalid_base_url');
  }

  /**
   * Resolves the `sourceId` option into a single comma-separated string.
   * @param sourceId - The source identifier(s) to resolve. Can be a string or an array of strings.
   * @returns The resolved source ID string, or an empty string if undefined.
   */
  private resolveSourceId(sourceId?: string | string[]): string {
    if (!sourceId) return '';
    if (typeof sourceId === 'string') return sourceId;
    return sourceId.join(',');
  }

  /**
   * Initializes analytics (GTM) based on configuration options.
   * @private
   */
  private initializeAnalytics() {
    const enableOfficialTracking = this.options.enableOfficialTracking ?? false;

    if (enableOfficialTracking) {
      const origin = new URL(this.baseUrl).origin;
      const officialGtmId = AnalyticsConfig.OFFICIAL_GTM_IDS.get(origin);

      if (officialGtmId) {
        this.gtmIds = [officialGtmId];
        this.loadGoogleTagManager(this.gtmIds);
      }
    }
  }

  /**
   * Resolves the target option (string or element) into an HTMLElement.
   * @param target - The target to resolve.
   * @returns The container HTMLElement.
   * @throws {MivaBDNError} If the target is invalid or not found.
   * @private
   */
  private resolveTarget(target: HTMLElement | string): HTMLElement {
    if (target instanceof HTMLElement) {
      return target;
    }
    if (typeof target === 'string') {
      const container = document.querySelector(target);
      if (!container) {
        throw new MivaBDNError(`Target element "${target}" not found.`, 'target_not_found');
      }
      return container as HTMLElement;
    }
    throw new MivaBDNError('Invalid target specified. Must be an HTMLElement or a selector.', 'invalid_target');
  }

  /**
   * Creates and appends a new iframe element to the target container.
   *
   * This method first clears any existing content (like old iframes) from the
   * container to ensure a clean initialization state.
   * It then constructs the iframe `src` URL with necessary query parameters
   * and appends the new iframe to the container.
   *
   * @param container - The parent element to append the iframe to.
   * @returns The newly created HTMLIFrameElement.
   * @private
   */
  private createIframe(container: HTMLElement): HTMLIFrameElement {
    // Clear the container to ensure a clean state and prevent conflicts
    // with any existing elements or previous instances.
    container.innerHTML = '';

    const created = document.createElement('iframe');

    const url = new URL(this.path, this.baseUrl);
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('appId', this.appId);
    if (this.debug) {
      url.searchParams.set('debug', String(this.debug));
    }
    if (this.sourceId) {
      url.searchParams.set('sourceId', this.sourceId);
    }
    if (this.locale) {
      url.searchParams.set('locale', this.locale);
    }

    created.src = url.toString();

    // Grant the embedded app the features it needs across the cross-origin
    // frame boundary:
    //   - autoplay: Chrome blocks Web Audio (AudioContext) output in a
    //     cross-origin iframe unless the frame may autoplay, even after a user
    //     gesture, so without it read-aloud / TTS narration stays silent while
    //     other media (e.g. voice previews) still play.
    //   - microphone: voice mode's hold-to-talk dictation calls getUserMedia,
    //     which a cross-origin iframe is denied unless microphone is delegated.
    created.allow = 'autoplay; microphone';

    container.appendChild(created);

    this.printLog('Created iframe.');

    return created;
  }

  /**
   * Internal handler for `message` events from the window.
   * Filters messages to ensure they are from the correct origin.
   * Dispatches events to the appropriate user-defined callbacks (`onReady`, `onConfirmed`).
   * Handles analytics events from iframe and forwards them to parent window's dataLayer.
   *
   * @param event - The MessageEvent object.
   * @private
   */
  private handleMessage(event: MessageEvent) {
    const { data, origin } = event;

    // Only accept messages from the trusted iframe origin
    if (origin !== this.origin) {
      this.printLog(`Received post message from untrusted origin ${origin} was ignored.`);
      return;
    }

    this.printLog(`Received post message from ${origin}:`, data);

    // Handle analytics events from iframe
    if (data?.type === 'gtm_event') {
      this.forwardAnalyticsEvent(data);
      return;
    }

    // Handle SDK status events
    switch (data?.status) {
      case 'ready': {
        this.onReady(data, this);
        // Acknowledge readiness to the iframe, delivering the SSO token (if any)
        // over the same trusted channel so it never appears in the iframe URL.
        // Send the token only in the FIRST acknowledgement: re-sending it on a
        // later handshake (iframe re-mount, duplicate 'ready') would replay a
        // single-use token and fail. A fresh page load makes a new instance.
        const includeToken = !!this.token && !this.tokenSent;
        this.postMessage({
          status: 'acknowledged',
          ...(includeToken ? { token: this.token } : {}),
        });
        if (includeToken) {
          this.tokenSent = true;
        }
        break;
      }
      case 'confirmed':
        this.onConfirmed(data, this);
        break;
      case 'error': {
        // Normalize the iframe's error payload into a MivaBDNError so both the
        // async (onError) and sync (throw) channels deliver the same type.
        const message = typeof data?.message === 'string' ? data.message : 'Miva application error.';
        const code = typeof data?.code === 'string' ? data.code : undefined;
        this.onError(new MivaBDNError(message, code), this);
        break;
      }
      default:
        // Ignore unknown message types
        break;
    }
  }

  /**
   * Forwards GTM events from iframe to parent window's dataLayer.
   * Adds 'miva.' prefix to event name for namespace isolation.
   * @param message - The message object containing GTM event data.
   * @private
   */
  private forwardAnalyticsEvent(message: { type: string; data: unknown }) {
    if (!message.data) {
      this.printLog('Received analytics event without data, ignoring.');
      return;
    }

    // Ensure dataLayer exists on window
    if (typeof window !== 'undefined') {
      (window as typeof window & { dataLayer?: unknown[] }).dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer || [];

      const dataLayer = (window as typeof window & { dataLayer: unknown[] }).dataLayer;

      const eventData = message.data as Record<string, unknown>;

      // Add 'miva.' prefix to event name for namespace isolation
      if (typeof eventData.event === 'string') {
        eventData.event = `miva.${eventData.event}`;
      }

      dataLayer.push(eventData);

      this.printLog(`Forwarded gtm_event to parent dataLayer:`, eventData);
    }
  }

  /**
   * Loads the Google Tag Manager script dynamically with multiple container IDs.
   * ⚠️ WARNING: All loaded GTM containers will receive all dataLayer events.
   * Configure your GTM triggers to exclude 'miva.*' events to prevent pollution.
   * Events from iframe are automatically prefixed with 'miva.' for isolation.
   * @param containerIds - Array of GTM container IDs.
   * @private
   */
  private loadGoogleTagManager(containerIds: string[]) {
    if (containerIds.length === 0) {
      return;
    }

    // Initialize dataLayer first (must exist before GTM scripts load)
    if (typeof window !== 'undefined') {
      (window as typeof window & { dataLayer?: unknown[] }).dataLayer
        = (window as typeof window & { dataLayer?: unknown[] }).dataLayer || [];
    }

    containerIds.forEach((containerId) => {
      // Check if this GTM container is already loaded (check for exact ID match at start of URL)
      const existingScript = document.querySelector(`script[src^="https://www.googletagmanager.com/gtm.js?id=${containerId}"]`);
      if (existingScript) {
        return;
      }

      // Push GTM initialization event to dataLayer before loading script
      const dataLayer = (window as typeof window & { dataLayer: unknown[] }).dataLayer;
      dataLayer.push({
        'gtm.start': new Date().getTime(),
        'event': 'gtm.js',
      });

      // Load GTM script after dataLayer is initialized
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;

      // Add error event listener
      script.onerror = (error) => {
        this.printLog(`Failed to load GTM script: ${containerId}`, error);
      };

      document.head.appendChild(script);
    });

    this.printLog(`Loaded Google Tag Manager with container IDs: ${containerIds.join(', ')}`);
  }

  private printLog(message: string, ...args: unknown[]) {
    if (this.debug) {
      console.log(`[MivaBDN:Iframe] ${message}`, ...args);
    }
  }
}

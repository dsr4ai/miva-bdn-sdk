/* eslint-disable no-console */
import MivaBDNError from './MivaBDNError';

const ALLOWED_ORIGINS = [
  'https://miva.bookai.com',
  'https://staging.miva.bookai.com',
  'https://dev.miva.bookai.com',
  'http://localhost:3000',
];

/**
 * Configuration options for the MivaBDN instance.
 */
export interface MivaBDNOptions {
  /**
   * The unique application identifier.
   */
  appId: string;

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
   * The DOM element or CSS selector string identifying where the
   * MivaBDN iframe will be mounted.
   */
  target: HTMLElement | string;
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
  private onReady: (data: unknown, instance: MivaBDN) => void = () => {};
  private origin: string = '';
  private options: MivaBDNOptions;

  /**
   * Creates an instance of MivaBDN.
   * @param options - The configuration options for this instance.
   */
  constructor(options: MivaBDNOptions) {
    if (!options.appId) {
      throw new MivaBDNError('appId is required for initialization.');
    }
    if (!options.target) {
      throw new MivaBDNError('target is required for initialization.');
    }
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
    this.appId = this.options.appId;
    this.baseUrl = this.resolveBaseUrl(this.options.baseUrl);
    this.debug = this.options.debug ?? false;
    this.messageHandler = this.handleMessage.bind(this);
    this.onConfirmed = this.options.onConfirmed ?? (() => {});
    this.onReady = this.options.onReady ?? (() => {});
    this.origin = new URL(this.baseUrl).origin;

    const container = this.resolveTarget(this.options.target);

    this.iframeEl = this.createIframe(container);

    window.addEventListener('message', this.messageHandler);

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
      throw new MivaBDNError('Failed to post message. Iframe is not available.');
    }

    this.iframeEl.contentWindow.postMessage(payload, this.origin);

    this.printLog(`Posted message to ${this.origin}:`, payload);
  }

  private resolveBaseUrl(url?: string): string {
    const [PROD, STAGING, DEV] = ALLOWED_ORIGINS;
    if (!url) {
      return PROD;
    }
    const { origin } = new URL(url);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return url;
    }
    throw new MivaBDNError(`Invalid baseUrl. Must be one of: ${PROD}, ${STAGING}, ${DEV}`);
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
        throw new MivaBDNError(`Target element "${target}" not found.`);
      }
      return container as HTMLElement;
    }
    throw new MivaBDNError('Invalid target specified. Must be an HTMLElement or a selector.');
  }

  /**
   * Creates and appends a new iframe element to the target container.
   *
   * This method first clears any existing content (like old iframes) from the
   * container to ensure a clean initialization state.
   * It then constructs the iframe `src` URL with necessary query parameters
   * (origin, appId, debug) and appends the new iframe to the container.
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

    const url = new URL(this.baseUrl);
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('appId', this.appId);
    url.searchParams.set('debug', this.debug ? '1' : '0');

    created.src = url.toString();

    container.appendChild(created);

    this.printLog(`Created iframe with src "${created.src}".`);

    return created;
  }

  /**
   * Internal handler for `message` events from the window.
   * Filters messages to ensure they are from the correct origin.
   * Dispatches events to the appropriate user-defined callbacks (`onReady`, `onConfirmed`).
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

    switch (data?.status) {
      case 'ready':
        this.onReady(data, this);
        // Acknowledge readiness to the iframe
        this.postMessage({ status: 'acknowledged' });
        break;
      case 'confirmed':
        this.onConfirmed(data, this);
        break;
      default:
        // Ignore unknown message types
        break;
    }
  }

  private printLog(message: string, ...args: unknown[]) {
    if (this.debug) {
      console.log(`[MivaBDN:Iframe] ${message}`, ...args);
    }
  }
}

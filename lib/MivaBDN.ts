/* eslint-disable no-console */
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
   * The base URL for the MivaBDN application to be loaded in the iframe.
   */
  baseUrl: string;

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
  private appId: string;
  private baseUrl: string;
  private debug: boolean;
  private iframeEl: HTMLIFrameElement | null = null;
  private messageHandler: (ev: MessageEvent) => void;
  private onConfirmed: (data: unknown, instance: MivaBDN) => void;
  private onReady: (data: unknown, instance: MivaBDN) => void;
  private origin: string;
  private target: HTMLElement | string;

  /**
   * Creates an instance of MivaBDN.
   * @param options - The configuration options for this instance.
   */
  constructor(options: MivaBDNOptions) {
    this.appId = options.appId;
    this.baseUrl = options.baseUrl;
    this.debug = options.debug ?? false;
    this.messageHandler = this.handleMessage.bind(this);
    this.onConfirmed = options.onConfirmed ?? (() => {});
    this.onReady = options.onReady ?? (() => {});
    this.origin = new URL(this.baseUrl).origin;
    this.target = options.target;
  }

  /**
   * Initializes the MivaBDN instance.
   * Validates configuration, creates the iframe, and establishes the message listener.
   * This method must be called to start the MivaBDN application.
   *
   * @throws {MivaBDNError} If required options (appId, baseUrl, target) are missing.
   */
  init() {
    if (!this.appId) {
      throw new MivaBDNError('appId is required for initialization.');
    }
    if (!this.baseUrl) {
      throw new MivaBDNError('baseUrl is required for initialization.');
    }
    if (!this.target) {
      throw new MivaBDNError('target is required for initialization.');
    }

    const container = this.resolveTarget(this.target);

    this.iframeEl = this.createIframe(container);

    window.addEventListener('message', this.messageHandler);

    if (this.debug) console.log('[MivaBDN:Host] Initialized and started listening for messages.');
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

    if (this.debug) console.log('[MivaBDN:Host] Destroyed and removed iframe.');
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

    if (this.debug) console.log(`[MivaBDN:Host] Posted message to ${this.origin}:`, payload);
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

    // Append required parameters for the iframe application
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('appId', this.appId);
    url.searchParams.set('debug', this.debug ? '1' : '0');

    created.src = url.toString();
    container.appendChild(created);

    if (this.debug) console.log(`[MivaBDN:Host] Created iframe with src "${created.src}".`);

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

    // Security check: Only accept messages from the trusted iframe origin
    if (origin !== this.origin) return;

    if (this.debug) console.log(`[MivaBDN:Host] Received post message from ${origin}:`, data);

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
}

/* eslint-disable no-console */
import MivaBDNError from './MivaBDNError';

export interface MivaBDNOptions {
  appId: string;
  baseUrl: string;
  debug?: boolean;
  onConfirmed?: (data: unknown, instance: MivaBDN) => void;
  onReady?: (data: unknown, instance: MivaBDN) => void;
  target: HTMLElement | string;
}

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

  destroy() {
    window.removeEventListener('message', this.messageHandler);

    if (this.debug) console.log('[MivaBDN:Host] Destroyed and stopped listening for messages.');
  }

  postMessage(payload: unknown) {
    if (!this.iframeEl || !this.iframeEl.contentWindow) {
      throw new MivaBDNError('Failed to post message.');
    }

    this.iframeEl.contentWindow.postMessage(payload, this.origin);

    if (this.debug) console.log(`[MivaBDN:Host] Posted message to ${this.origin}:`, payload);
  }

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

  private createIframe(container: HTMLElement): HTMLIFrameElement {
    const existing = container.querySelector('iframe');
    if (existing) return existing;

    const created = document.createElement('iframe');
    const url = new URL(this.baseUrl);
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('appId', this.appId);
    url.searchParams.set('debug', this.debug ? '1' : '0');
    created.src = url.toString();
    container.appendChild(created);

    if (this.debug) console.log(`[MivaBDN:Host] Created iframe with src "${created.src}".`);

    return created;
  }

  private handleMessage(event: MessageEvent) {
    const { data, origin } = event;
    if (origin !== this.origin) return;

    if (this.debug) console.log(`[MivaBDN:Host] Received post message from ${origin}:`, data);

    switch (data?.status) {
      case 'ready':
        this.onReady(data, this);
        this.postMessage({ status: 'acknowledged' });
        break;
      case 'confirmed':
        this.onConfirmed(data, this);
        break;
      default:
        break;
    }
  }
}

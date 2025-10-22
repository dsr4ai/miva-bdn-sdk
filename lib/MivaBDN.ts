/* eslint-disable no-console */
export interface MivaBDNOptions {
  appId: string;
  containerId: string;
  debug?: boolean;
  mivaUrl: string;
  onConfirmed?: (data: unknown, instance: MivaBDN) => void;
  onReady?: (data: unknown, instance: MivaBDN) => void;
}

export default class MivaBDN {
  private appId: string;
  private messageHandler: (ev: MessageEvent) => void;
  private containerId: string;
  private iframeEl: HTMLIFrameElement | null = null;
  private debug: boolean;
  private mivaUrl: string;
  private onConfirmed: (data: unknown, instance: MivaBDN) => void;
  private onReady: (data: unknown, instance: MivaBDN) => void;
  private origin: string;

  constructor(options: MivaBDNOptions) {
    this.appId = options.appId;
    this.messageHandler = this.handleMessage.bind(this);
    this.containerId = options.containerId;
    this.debug = options.debug ?? false;
    this.mivaUrl = options.mivaUrl;
    this.onConfirmed = options.onConfirmed ?? (() => {});
    this.onReady = options.onReady ?? (() => {});
    this.origin = new URL(this.mivaUrl).origin;
  }

  init() {
    if (!this.appId) {
      throw new Error('[MivaBDN:Host] appId is required for initialization.');
    }
    if (!this.mivaUrl) {
      throw new Error('[MivaBDN:Host] mivaUrl is required for initialization.');
    }
    if (!this.containerId) {
      throw new Error('[MivaBDN:Host] containerId is required for initialization.');
    }

    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`[MivaBDN:Host] Container element with id "${this.containerId}" not found.`);
    }

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
      if (this.debug) console.warn('[MivaBDN:Host] Failed to post message — iframe or contentWindow not found.');
      return;
    }

    this.iframeEl.contentWindow.postMessage(payload, this.origin);

    if (this.debug) console.log(`[MivaBDN:Host] Posted message to ${this.origin}:`, payload);
  }

  private createIframe(container: HTMLElement): HTMLIFrameElement {
    const existing = container.querySelector('iframe');
    if (existing) return existing;

    const created = document.createElement('iframe');
    const url = new URL(this.mivaUrl);
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

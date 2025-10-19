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
      throw new Error('MivaBDN: appId is required for initialization.');
    }
    if (!this.mivaUrl) {
      throw new Error('MivaBDN: mivaUrl is required for initialization.');
    }
    if (!this.containerId) {
      throw new Error('MivaBDN: containerId is required for initialization.');
    }

    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`MivaBDN: Container element with id "${this.containerId}" not found.`);
    }

    this.iframeEl = this.createIframe(container);
    window.addEventListener('message', this.messageHandler);

    if (this.debug) {
      console.log('MivaBDN: Initialized and started listening for messages.');
    }
  }

  destroy() {
    window.removeEventListener('message', this.messageHandler);

    if (this.debug) {
      console.log('MivaBDN: Destroyed and stopped listening for messages.');
    }
  }

  postMessage(payload: unknown) {
    if (!this.iframeEl || !this.iframeEl.contentWindow) {
      if (this.debug) {
        console.warn('MivaBDN: Failed to post message — iframe or contentWindow not found.');
      }
      return;
    }

    this.iframeEl.contentWindow.postMessage(payload, this.origin);

    if (this.debug) {
      console.log(`MivaBDN: Posted message to ${this.origin}: ${JSON.stringify(payload)}.`);
    }
  }

  private createIframe(container: HTMLElement): HTMLIFrameElement {
    const existing = container.querySelector('iframe');
    if (existing) return existing;

    const created = document.createElement('iframe');
    const url = new URL(this.mivaUrl);
    url.searchParams.set('appId', this.appId);
    created.src = url.toString();
    container.appendChild(created);

    if (this.debug) {
      console.log(`MivaBDN: Created iframe with src "${created.src}".`);
    }

    return created;
  }

  private handleMessage(event: MessageEvent) {
    if (event.origin !== this.origin) return;

    const data = event.data;

    switch (data?.status) {
      case 'ready':
        if (this.debug) {
          console.log('MivaBDN: Received "ready" message from iframe.');
        }
        this.onReady(data, this);
        this.postMessage({ status: 'acknowledged' });
        break;

      case 'confirmed':
        if (this.debug) {
          console.log('MivaBDN: Received "confirmed" message from iframe.');
        }
        this.onConfirmed(data, this);
        break;

      default:
        if (this.debug) {
          console.warn(`MivaBDN: Received unknown message: ${JSON.stringify(data)}.`);
        }
        break;
    }
  }
}

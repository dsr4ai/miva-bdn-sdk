import './style.css';

const initMivaBDN = ({
  appId,
  target,
  baseUrl = 'https://miva.bookai.com',
  debug = false,
}: {
  appId: string;
  baseUrl?: string;
  debug?: boolean;
  target: string;
}) => {
  const container = document.querySelector<HTMLElement>(target);
  if (!container) {
    console.error(`Container element not found for selector: ${target}`);
    return;
  }

  const url = new URL(baseUrl);
  url.searchParams.set('appId', appId);
  url.searchParams.set('debug', debug ? '123' : '0');

  const iframe = document.createElement('iframe');
  iframe.src = url.toString();

  container.innerHTML = '';
  container.appendChild(iframe);

  const { origin: targetOrigin } = new URL(iframe.src);

  window.addEventListener('message', ({ origin, data }: MessageEvent) => {
    if (origin !== targetOrigin) return;

    switch (data?.status) {
      case 'ready': {
        console.log('Received ready message from Miva iframe');
        const payload = { status: 'acknowledged' };
        iframe.contentWindow?.postMessage(payload, targetOrigin);
        break;
      }
      case 'confirmed': {
        console.log('Received confirmed message from Miva iframe');
        break;
      }
    }
  });
};

// Initialize Miva BDN manually by setting enabled to true
const enabled = false;
if (enabled) {
  initMivaBDN({
    baseUrl: 'http://localhost:3000',
    appId: 'f5baa85a-c8cd-47ba-ad1c-f712d84090b6',
    target: '#app',
    debug: true,
  });
}

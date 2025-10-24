import './style.css';
import { MivaBDN } from '../lib';

const mivaBDN = new MivaBDN({
  appId: import.meta.env.VITE_APP_ID as string,
  target: '#app',
  baseUrl: 'https://staging.miva.bookai.com/',
  debug: true,
});

try {
  mivaBDN.init();
} catch (error) {
  console.error(error);
}

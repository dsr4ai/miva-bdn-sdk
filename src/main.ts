import './style.css';
import { MivaBDN } from '../lib';

const mivaBDN = new MivaBDN({
  appId: import.meta.env.VITE_MIVA_BDN_APP_ID as string,
  baseUrl: import.meta.env.VITE_MIVA_BDN_BASE_URL as string,
  debug: import.meta.env.VITE_MIVA_BDN_DEBUG as boolean,
  target: '#app',
});

try {
  mivaBDN.init();
} catch (error) {
  console.error(error);
}

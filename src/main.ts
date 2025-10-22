import { MivaBDN } from '../lib';
import './style.css';

const mivaBDN = new MivaBDN({
  appId: 'aebd41ea-6504-4e9e-9756-e6d79b04abc7',
  containerId: 'app',
  mivaUrl: 'http://localhost:3000',
  debug: true,
});

mivaBDN.init();

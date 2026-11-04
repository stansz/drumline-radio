import './ui/style.css';
import { registerServiceWorker } from './pwa/register';
import { setupInstall } from './ui/install';
import { startUi } from './ui/ui';

startUi();
registerServiceWorker();
const installButton = document.querySelector<HTMLButtonElement>('#install');
if (installButton) setupInstall(installButton);

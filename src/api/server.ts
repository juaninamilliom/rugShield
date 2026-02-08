import { createApp } from './app';
import { logInfo } from '../utils/logger';

const port = Number(process.env.PORT || 3400);
const app = createApp();

app.listen(port, () => {
  logInfo('server_started', { service: 'rugshield', port });
});

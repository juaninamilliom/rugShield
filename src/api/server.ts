import { createApp } from './app';

const port = Number(process.env.PORT || 3400);
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`RugShield API listening on :${port}`);
});

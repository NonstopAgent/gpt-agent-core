import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'webview', 'dist')));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is listening on http://0.0.0.0:${port}`);
});

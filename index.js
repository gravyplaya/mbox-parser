import express from 'express';
import multer from 'multer';
import Mbox from 'node-mbox';

import { simpleParser } from 'mailparser';
import fs from 'fs';
import stream from 'stream';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest: '/tmp/' });

app.post('/parse-mbox', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const mbox = new Mbox(fs.createReadStream(req.file.path), { stream: true });
  const messages = [];

  mbox.on('message', async (msg) => {
    try {
      const parsed = await simpleParser(msg);
      messages.push({
        subject: parsed.subject,
        from: parsed.from?.text,
        to: parsed.to?.text,
        date: parsed.date,
        text: parsed.text,
        html: parsed.html
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  mbox.on('error', (err) => {
    console.error('Error parsing MBOX:', err);
    res.status(500).json({ error: 'Error parsing MBOX file' });
  });

  mbox.on('end', () => {
    res.json({ messages });
    // Clean up the uploaded file
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
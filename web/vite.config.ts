import { promises as fs } from 'node:fs';
import path from 'node:path';

import { defineConfig, PluginOption } from 'vite';
import solidPlugin from 'vite-plugin-solid';

const CHANGELOGS_DIR = path.resolve(__dirname, '..', 'changelogs');

const serveChangelogs = (): PluginOption => ({
  name: 'serve-changelog-directory',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/changelogs', async (req, res, next) => {
      if (!req.url) {
        next();
        return;
      }

      const method = req.method ?? 'GET';
      const [rawPath] = req.url.split('?');
      const requestPath = decodeURIComponent((rawPath ?? '').replace(/^\/+/, ''));

      if (!requestPath) {
        res.statusCode = 400;
        res.end('Missing file path');
        return;
      }

      const target = path.resolve(CHANGELOGS_DIR, requestPath);
      if (!target.startsWith(CHANGELOGS_DIR)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      const log = server.config.logger;
      log.info(`[changelog] ${method} ${requestPath}`, { timestamp: true });

      if (method === 'GET') {
        try {
          const content = await fs.readFile(target);
          const extension = path.extname(target);
          const contentType = extension === '.json' ? 'application/json' : 'text/plain';
          res.setHeader('Content-Type', contentType);
          res.statusCode = 200;
          res.end(content);
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;
          if (nodeError.code === 'ENOENT') {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          next(nodeError);
        }
        return;
      }

      if (method === 'PUT' || method === 'POST') {
        const body: Uint8Array[] = [];

        req.on('data', (chunk) => {
          body.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });

        req.on('error', (streamError) => {
          next(streamError);
        });

        req.on('end', async () => {
          try {
            const payload = Buffer.concat(body).toString('utf-8');
            JSON.parse(payload);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, payload, 'utf-8');
            res.statusCode = 204;
            res.end();
          } catch (writeError) {
            if (writeError instanceof SyntaxError) {
              res.statusCode = 400;
              res.end('Invalid JSON payload');
              return;
            }
            const nodeError = writeError as NodeJS.ErrnoException;
            if (nodeError.code === 'EACCES') {
              res.statusCode = 403;
              res.end('Permission denied');
              return;
            }
            next(writeError);
          }
        });
        return;
      }

      next();
    });
  }
});

const emitChangelogs = (): PluginOption => ({
  name: 'emit-changelog-directory',
  apply: 'build',
  async generateBundle() {
    try {
      const entries = await fs.readdir(CHANGELOGS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fileName = `changelogs/${entry.name}`;
        const source = await fs.readFile(path.join(CHANGELOGS_DIR, entry.name));
        this.emitFile({ type: 'asset', fileName, source });
      }
    } catch (error) {
      this.warn(`No se pudo copiar la carpeta de changelogs: ${(error as Error).message}`);
    }
  }
});

export default defineConfig({
  plugins: [solidPlugin(), serveChangelogs(), emitChangelogs()],
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: ['..']
    }
  },
  build: {
    target: 'esnext'
  }
});

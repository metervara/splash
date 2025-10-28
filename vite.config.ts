import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

function scanSplashHtmlFilesInSrc(projectRoot: string): { name: string; absPath: string; urlPath: string; title: string; description: string }[] {
    const srcDir = path.resolve(projectRoot, 'src');
    if (!fs.existsSync(srcDir)) return [];
    const dirEntries = fs.readdirSync(srcDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
        .map((d) => d.name)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return dirEntries
        .map((dir) => {
            const indexPath = path.resolve(srcDir, dir, 'index.html');
            if (!fs.existsSync(indexPath)) return null;
            const html = fs.readFileSync(indexPath, 'utf8');
            const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : dir;
            // Extract description - handle both single and double quotes
            let description = '';
            const metaMatch = html.match(/<meta\s+name=["']description["'][^>]*>/i);
            if (metaMatch) {
                const metaTag = metaMatch[0];
                // Try double quotes first
                let contentMatch = metaTag.match(/content="([^"]*)"/);
                if (!contentMatch) {
                    // Try single quotes
                    contentMatch = metaTag.match(/content='([^']*)'/);
                }
                if (contentMatch) {
                    description = contentMatch[1].trim();
                }
            }
            return { name: `splash_${dir}`, absPath: indexPath, urlPath: `/${dir}/`, title, description };
        })
        .filter((p): p is { name: string; absPath: string; urlPath: string; title: string; description: string } => p !== null);
}

function writeSplashManifest(projectRoot: string, pages: { urlPath: string; title: string; description: string }[]): void {
	const publicDir = path.resolve(projectRoot, 'public');
	if (!fs.existsSync(publicDir)) {
		fs.mkdirSync(publicDir, { recursive: true });
	}
	const manifestPath = path.resolve(publicDir, 'splash-manifest.json');
    const payload = pages.map((p) => ({ href: p.urlPath, title: p.title, description: p.description }));
	fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2) + '\n');
}

function generateSplashManifestPlugin() {
	return {
		name: 'generate-splash-manifest',
		apply: 'serve',
		configureServer(server: any) {
            const root = server.config.root;
            const pages = scanSplashHtmlFilesInSrc(root);
			writeSplashManifest(root, pages);
			// Watch for changes and update manifest
            const watchDir = path.resolve(root, 'src');
            if (fs.existsSync(watchDir)) {
                fs.watch(watchDir, { persistent: false }, () => {
                    const updatedPages = scanSplashHtmlFilesInSrc(root);
                    writeSplashManifest(root, updatedPages);
                });
            }
            // Dev rewrite: map /N/... to /src/N/...
            server.middlewares.use((req: any, _res: any, next: any) => {
                // Skip WebSocket upgrade requests (needed for HMR)
                if (req.headers.upgrade === 'websocket') {
                    return next();
                }
                
                // Skip HMR-related paths
                if (req.url && (req.url.includes('/@vite') || req.url.includes('/@fs') || req.url.includes('/__vite'))) {
                    return next();
                }
                
                const raw = req.url || '/';
                const [pathname, qs] = raw.split(/\?/, 2);
                const query = qs ? `?${qs}` : '';
                // Asset or nested path: /N/<rest>
                const asset = pathname.match(/^\/(\d+)\/(.+)$/);
                if (asset) {
                    req.url = `/src/${asset[1]}/${asset[2]}${query}`;
                    return next();
                }
                // Folder root: /N/ -> index.html
                const page = pathname.match(/^\/(\d+)\/?$/);
                if (page) {
                    req.url = `/src/${page[1]}/index.html${query}`;
                    return next();
                }
                next();
            });
            
            // Handle HMR for rewritten paths
            server.ws.on('connection', () => {
                // Force a full reload when files in subdirectories change
                const watcher = server.watcher;
                watcher.on('change', (file: string) => {
                    // If a file in a numbered directory changes, send full reload
                    if (file.match(/\/src\/\d+\//)) {
                        server.ws.send({
                            type: 'full-reload',
                            path: '*'
                        });
                    }
                });
            });
		},
	};
}

function generateSplashManifestBuildPlugin() {
	return {
		name: 'generate-splash-manifest-build',
		apply: 'build',
		buildStart(this: any) {
			// @ts-ignore - vite injects config
                const root: string = (this as any).meta?.watchMode ? process.cwd() : process.cwd();
                const pages = scanSplashHtmlFilesInSrc(root);
			writeSplashManifest(root, pages);
		},
	};
}

export default defineConfig(({ command }) => {
	const projectRoot = process.cwd();
    const splashPages = scanSplashHtmlFilesInSrc(projectRoot);
	const input: Record<string, string> = { index: path.resolve(projectRoot, 'index.html') };
	for (const page of splashPages) {
		input[page.name] = page.absPath;
	}

    return {
        plugins: [
            generateSplashManifestPlugin(),
            generateSplashManifestBuildPlugin(),
            // After build, move dist/src/N/index.html -> dist/N/index.html
            {
                name: 'restructure-splash-output-to-root',
                apply: 'build',
                closeBundle() {
                    const outDir = path.resolve(process.cwd(), 'dist');
                    const srcOut = path.join(outDir, 'src');
                    if (!fs.existsSync(srcOut)) return;
                    const entries = fs.readdirSync(srcOut, { withFileTypes: true })
                        .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
                        .map((d) => d.name)
                        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                    for (const dir of entries) {
                        const fromPath = path.join(srcOut, dir, 'index.html');
                        if (!fs.existsSync(fromPath)) continue;
                        const destDir = path.join(outDir, dir);
                        const toPath = path.join(destDir, 'index.html');
                        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                        fs.renameSync(fromPath, toPath);
                    }
                },
            },
        ],
        resolve: {
            alias: {
                '/src': path.resolve(projectRoot, 'src'),
            },
        },
        build: {
			rollupOptions: {
				input,
			},
            outDir: 'dist',
        },
        server: {
            open: '/index.html',
            watch: {
                usePolling: false,
                interval: 100,
            },
            hmr: {
                overlay: true,
            },
        },
	};
});



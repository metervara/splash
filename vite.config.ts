import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

function scanRootSplashHtmlFiles(projectRoot: string): { name: string; absPath: string; urlPath: string; title: string }[] {
	const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
	return entries
		.filter((e) => e.isFile() && e.name.endsWith('.html') && e.name.toLowerCase() !== 'index.html' && e.name.toLowerCase() !== 'random.html')
		.map((e) => {
			const absPath = path.resolve(projectRoot, e.name);
			const baseName = e.name.replace(/\.html$/i, '');
			const html = fs.readFileSync(absPath, 'utf8');
			const m = html.match(/<title>([^<]*)<\/title>/i);
			const title = m ? m[1].trim() : baseName;
			return { name: `splash_${baseName}`, absPath, urlPath: `/${e.name}`, title };
		})
		.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
}

function writeSplashManifest(projectRoot: string, pages: { urlPath: string; title: string }[]): void {
	const publicDir = path.resolve(projectRoot, 'public');
	if (!fs.existsSync(publicDir)) {
		fs.mkdirSync(publicDir, { recursive: true });
	}
	const manifestPath = path.resolve(publicDir, 'splash-manifest.json');
	const payload = pages.map((p) => ({ href: p.urlPath, title: p.title }));
	fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2) + '\n');
}

function generateSplashManifestPlugin() {
	return {
		name: 'generate-splash-manifest',
		apply: 'serve',
		configureServer(server: any) {
			const root = server.config.root;
				const pages = scanRootSplashHtmlFiles(root);
			writeSplashManifest(root, pages);
			// Watch for changes and update manifest
				fs.watch(root, { persistent: false }, () => {
					const updatedPages = scanRootSplashHtmlFiles(root);
					writeSplashManifest(root, updatedPages);
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
				const pages = scanRootSplashHtmlFiles(root);
			writeSplashManifest(root, pages);
		},
	};
}

export default defineConfig(({ command }) => {
	const projectRoot = process.cwd();
    const splashPages = scanRootSplashHtmlFiles(projectRoot);
	const input: Record<string, string> = { index: path.resolve(projectRoot, 'index.html') };
	for (const page of splashPages) {
		input[page.name] = page.absPath;
	}

	return {
		plugins: [generateSplashManifestPlugin(), generateSplashManifestBuildPlugin()],
		build: {
			rollupOptions: {
				input,
			},
		},
		server: {
			open: '/index.html',
		},
	};
});



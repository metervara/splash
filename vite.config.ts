import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { gridManifestPlugin } from '@metervara/grid-listing/vite-plugin';

const THUMBNAIL_PATTERNS = [
    'thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg',
    'thumbnail.webp', 'thumbnail.gif', 'thumbnail.mp4', 'thumbnail.webm',
];

type GridManifestItem = {
    path: string;
    name: string;
    group: string;
    title?: string;
    description?: string;
    short?: string;
    tags?: string[];
    thumbnail?: string;
    href: string;
    hidden: boolean;
};

function findDirsWithIndex(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const result: string[] = [];
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        const full = path.join(dir, e.name);
        const indexPath = path.join(full, 'index.html');
        if (fs.existsSync(indexPath)) result.push(full);
        result.push(...findDirsWithIndex(full));
    }
    return result;
}

function extractMetaContent(html: string, name: string): string | undefined {
    const re = new RegExp(
        `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>|` +
        `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*>`,
        'i'
    );
    const m = html.match(re);
    if (!m) return undefined;
    return (m[1] ?? m[2])?.trim();
}

function extractTags(html: string): string[] {
    const content = extractMetaContent(html, 'tags');
    if (!content) return [];
    return content.split(',').map((s) => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function buildGridManifestWithShort(
    dir: string,
    options: { basePath?: string; includeHidden?: boolean }
): GridManifestItem[] {
    const basePath = (options.basePath ?? '/').replace(/\/+$/, '') + '/';
    const includeHidden = options.includeHidden ?? false;
    const dirs = findDirsWithIndex(dir);
    const items: GridManifestItem[] = [];
    for (const absDir of dirs) {
        const relPath = path.relative(dir, absDir);
        const name = path.basename(absDir);
        const hidden = name.startsWith('_');
        if (hidden && !includeHidden) continue;
        const pathPosix = relPath.split(path.sep).join('/');
        const group = pathPosix.includes('/') ? pathPosix.split('/')[0]! : 'misc';
        const indexPath = path.join(absDir, 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
        const description = extractMetaContent(html, 'description');
        const short = extractMetaContent(html, 'short');
        const tags = extractTags(html);
        let thumbnail: string | undefined;
        for (const p of THUMBNAIL_PATTERNS) {
            if (fs.existsSync(path.join(absDir, p))) {
                thumbnail = `${pathPosix}/${p}`.replace(/\\/g, '/');
                break;
            }
        }
        const href = `${basePath}${pathPosix}/`.replace(/\/+/g, '/');
        items.push({
            path: pathPosix,
            name,
            group,
            title,
            description,
            short,
            tags: tags.length > 0 ? tags : undefined,
            thumbnail,
            href,
            hidden,
        });
    }
    return items.sort((a, b) => {
        const na = parseInt(a.name, 10);
        const nb = parseInt(b.name, 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.path.localeCompare(b.path);
    });
}

function gridManifestWithShortPlugin(manifestDir: string, basePath = '/') {
    const moduleId = 'virtual:grid-manifest';
    const resolvedId = '\0' + moduleId;
    return {
        name: 'grid-manifest-with-short',
        enforce: 'pre' as const,
        resolveId(id: string) {
            if (id === moduleId) return resolvedId;
            return null;
        },
        load(id: string) {
            if (id !== resolvedId) return null;
            const items = buildGridManifestWithShort(manifestDir, { basePath, includeHidden: false });
            return `export default ${JSON.stringify({ items }, null, 2)};`;
        },
    };
}

type SplashPage = {
    id: string;
    name: string;
    absPath: string;
    urlPath: string;
    title: string;
    description: string;
};

function scanSketchPages(projectRoot: string): SplashPage[] {
    const sketchesDir = path.resolve(projectRoot, 'src/sketches');
    if (!fs.existsSync(sketchesDir)) return [];
    const dirEntries = fs.readdirSync(sketchesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
        .map((d) => d.name)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return dirEntries
        .map((dir) => {
            const dirAbsPath = path.resolve(sketchesDir, dir);
            const indexPath = path.resolve(dirAbsPath, 'index.html');
            if (!fs.existsSync(indexPath)) return null;
            const html = fs.readFileSync(indexPath, 'utf8');
            const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : dir;
            let description = '';
            const metaMatch = html.match(/<meta\s+name=["']description["'][^>]*>/i);
            if (metaMatch) {
                const metaTag = metaMatch[0];
                let contentMatch = metaTag.match(/content="([^"]*)"/);
                if (!contentMatch) {
                    contentMatch = metaTag.match(/content='([^']*)'/);
                }
                if (contentMatch) {
                    description = contentMatch[1].trim();
                }
            }
            return {
                id: dir,
                name: `sketch_${dir}`,
                absPath: indexPath,
                urlPath: `/${dir}/`,
                title,
                description,
            };
        })
        .filter((p): p is SplashPage => p !== null);
}

function splashDevServerPlugin() {
    return {
        name: 'splash-dev-server',
        apply: 'serve' as const,
        configureServer(server: any) {
            // Add middleware BEFORE Vite's internal middleware (no return)
            server.middlewares.use((req: any, _res: any, next: any) => {
                if (req.headers.upgrade === 'websocket') return next();
                if (req.url && (req.url.includes('/@vite') || req.url.includes('/@fs') || req.url.includes('/__vite'))) {
                    return next();
                }

                const raw = req.url || '/';
                const [pathname, qs] = raw.split(/\?/, 2);
                const query = qs ? `?${qs}` : '';

                // Asset or nested path: /N/<rest>
                const asset = pathname.match(/^\/(\d+)\/(.+)$/);
                if (asset) {
                    req.url = `/src/sketches/${asset[1]}/${asset[2]}${query}`;
                    return next();
                }
                // Folder root: /N/ or /N -> index.html
                const page = pathname.match(/^\/(\d+)\/?$/);
                if (page) {
                    req.url = `/src/sketches/${page[1]}/index.html${query}`;
                    return next();
                }
                next();
            });
        },
    };
}

export default defineConfig(({ command }) => {
	const projectRoot = process.cwd();
    const sketchPages = scanSketchPages(projectRoot);
	const input: Record<string, string> = { index: path.resolve(projectRoot, 'index.html') };
	for (const page of sketchPages) {
		input[page.name] = page.absPath;
	}

    const sketchesDir = path.resolve(projectRoot, 'src/sketches');
    return {
        plugins: [
            gridManifestWithShortPlugin(sketchesDir, '/'),
            gridManifestPlugin({
                dir: sketchesDir,
                basePath: '/',
            }),
            splashDevServerPlugin(),
            // After build, move dist/src/sketches/N/index.html -> dist/N/index.html
            // and copy static assets (thumbnails, etc.) from source to dist/N/
            {
                name: 'restructure-sketch-output-to-root',
                apply: 'build',
                closeBundle() {
                    const outDir = path.resolve(process.cwd(), 'dist');
                    const sketchesOut = path.join(outDir, 'src', 'sketches');
                    const sketchesSrc = path.resolve(process.cwd(), 'src', 'sketches');
                    
                    if (!fs.existsSync(sketchesOut)) return;
                    
                    const entries = fs.readdirSync(sketchesOut, { withFileTypes: true })
                        .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
                        .map((d) => d.name)
                        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                    
                    for (const dir of entries) {
                        const destDir = path.join(outDir, dir);
                        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                        
                        // Move index.html from dist/src/sketches/N/ to dist/N/
                        const indexFromPath = path.join(sketchesOut, dir, 'index.html');
                        if (fs.existsSync(indexFromPath)) {
                            const indexToPath = path.join(destDir, 'index.html');
                            fs.renameSync(indexFromPath, indexToPath);
                        }
                        
                        // Copy static assets (thumbnails, etc.) from source to dist/N/
                        const sourceDir = path.join(sketchesSrc, dir);
                        if (fs.existsSync(sourceDir)) {
                            const copyRecursive = (src: string, dest: string) => {
                                if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                                const entries = fs.readdirSync(src, { withFileTypes: true });
                                for (const entry of entries) {
                                    const srcPath = path.join(src, entry.name);
                                    const destPath = path.join(dest, entry.name);
                                    
                                    // Skip index.html, index.ts, index.css as they're handled by Vite
                                    if (entry.name === 'index.html' || entry.name === 'index.ts' || entry.name === 'index.css') {
                                        continue;
                                    }
                                    
                                    if (entry.isDirectory()) {
                                        copyRecursive(srcPath, destPath);
                                    } else {
                                        fs.copyFileSync(srcPath, destPath);
                                    }
                                }
                            };
                            copyRecursive(sourceDir, destDir);
                        }
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



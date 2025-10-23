/* eslint-disable */
// Simple manifest generator: scans root for *.html files (excluding index.html and random.html)
// and writes public/splash-manifest.json as [{ href, title }].

const { readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function extractTitle(html) {
	const match = html.match(/<title>([^<]*)<\/title>/i);
	return match ? match[1].trim() : '';
}

function main() {
	const root = process.cwd();
	const files = readdirSync(root, { withFileTypes: true })
		.filter((d) => d.isFile() && d.name.endsWith('.html'))
		.map((d) => d.name)
		.filter((n) => n !== 'index.html' && n !== 'random.html');

	const entries = files
		.sort()
		.map((name) => {
			const html = readFileSync(join(root, name), 'utf8');
			const title = extractTitle(html) || name.replace(/\.html$/, '');
			return { href: `/${name}`, title };
		});

	const outPath = join(root, 'public', 'splash-manifest.json');
	writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n', 'utf8');
	console.log(`Wrote ${entries.length} entries to public/splash-manifest.json`);
}

main();

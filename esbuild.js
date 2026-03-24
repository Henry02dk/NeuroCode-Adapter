// const esbuild = require("esbuild");

// const production = process.argv.includes('--production');
// const watch = process.argv.includes('--watch');

// /**
//  * @type {import('esbuild').Plugin}
//  */
// const esbuildProblemMatcherPlugin = {
// 	name: 'esbuild-problem-matcher',

// 	setup(build) {
// 		build.onStart(() => {
// 			console.log('[watch] build started');
// 		});
// 		build.onEnd((result) => {
// 			result.errors.forEach(({ text, location }) => {
// 				console.error(`✘ [ERROR] ${text}`);
// 				console.error(`    ${location.file}:${location.line}:${location.column}:`);
// 			});
// 			console.log('[watch] build finished');
// 		});
// 	},
// };

// async function main() {
// 	// Build extension
// 	const extCtx = await esbuild.context({
// 		entryPoints: ['src/extension.ts'],
// 		bundle: true,
// 		format: 'cjs',
// 		minify: production,
// 		sourcemap: !production,
// 		sourcesContent: false,
// 		platform: 'node',
// 		outfile: 'dist/extension.js',
// 		external: ['vscode'],
// 		logLevel: 'silent',
// 		plugins: [esbuildProblemMatcherPlugin],
// 	});

// 	// Build MCP server as a separate standalone bundle
// 	const serverCtx = await esbuild.context({
// 		entryPoints: ['src/mcp/server.ts'],
// 		bundle: true,
// 		format: 'cjs',
// 		minify: production,
// 		sourcemap: !production,
// 		sourcesContent: false,
// 		platform: 'node',
// 		outfile: 'dist/mcp/server.js',
// 		logLevel: 'silent',
// 		plugins: [esbuildProblemMatcherPlugin],
// 	});

// 	if (watch) {
// 		await extCtx.watch();
// 		await serverCtx.watch();
// 	} else {
// 		await extCtx.rebuild();
// 		await extCtx.dispose();
// 		await serverCtx.rebuild();
// 		await serverCtx.dispose();
// 	}
// }

// main().catch(e => {
// 	console.error(e);
// 	process.exit(1);
// });

const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(`    ${location.file}:${location.line}:${location.column}:`);
				}
			});
			console.log('[watch] build finished');
		});
	},
};

const commonOptions = {
	bundle: true,
	format: 'cjs',
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	platform: 'node',
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin],
	external: [
		'vscode',
		'@anthropic-ai/sdk'
	],
};

async function main() {
	const extCtx = await esbuild.context({
		...commonOptions,
		entryPoints: ['src/extension.ts'],
		outfile: 'dist/extension.js',
	});

	const serverCtx = await esbuild.context({
		...commonOptions,
		entryPoints: ['src/mcp/server.ts'],
		outfile: 'dist/mcp/server.js',
	});

	if (watch) {
		await extCtx.watch();
		await serverCtx.watch();
	} else {
		await extCtx.rebuild();
		await serverCtx.rebuild();
		await extCtx.dispose();
		await serverCtx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
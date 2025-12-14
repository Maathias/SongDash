import { compile } from 'nexe'
import { join } from 'path'

// NOTE: nexe currently has limited ESM (ES Modules) support
// The binary build works but has issues with ES module imports at runtime
// This is a known limitation: https://github.com/nexe/nexe/issues/836
// Workarounds:
// 1. Convert to CommonJS (require/module.exports)
// 2. Use a different tool like `pkg` or `caxa`
// 3. Wait for better ESM support in nexe

const targets = [
	{ platform: 'windows', arch: 'x64' },
	{ platform: 'linux', arch: 'x64' },
]

async function buildBinary(target) {
	const outputName = `songdash-${target.platform}-${target.arch}${
		target.platform === 'windows' ? '.exe' : ''
	}`

	console.log(`Building ${outputName}...`)

	await compile({
		input: './dist-server/server.cjs', // Use Vite-bundled CommonJS file
		output: join('build', outputName),
		target: `${target.platform}-${target.arch}-14.15.3`, // Node.js version with pre-built binaries
		resources: ['./dist/**/*', './public/**/*'],
		build: false, // Use pre-built Node binaries
		loglevel: 'info',
	})

	console.log(`✓ Built ${outputName}`)
}

async function buildAll() {
	console.log('Building binaries for all platforms...\n')

	for (const target of targets) {
		try {
			await buildBinary(target)
		} catch (error) {
			console.error(`Failed to build for ${target.platform}-${target.arch}:`, error)
			process.exit(1)
		}
	}

	console.log('\n✓ All binaries built successfully!')
}

buildAll()

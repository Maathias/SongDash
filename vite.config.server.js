import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
	build: {
		ssr: true,
		outDir: 'dist-server',
		emptyOutDir: true,
		rollupOptions: {
			input: './server.js',
			output: {
				format: 'cjs', // CommonJS for nexe compatibility
				entryFileNames: 'server.cjs',
			},
		},
		target: 'node14',
		minify: false, // Keep readable for debugging
	},
	ssr: {
		// Bundle most dependencies, but exclude native modules
		noExternal: true,
		// Keep native/binary modules external for nexe to handle
		external: ['ws'],
	},
})

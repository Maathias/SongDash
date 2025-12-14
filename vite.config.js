import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
	root: 'src/pages',
	build: {
		outDir: '../../dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				debug: resolve(__dirname, 'src/pages/debug.html'),
				host: resolve(__dirname, 'src/pages/host.html'),
				player: resolve(__dirname, 'src/pages/player.html'),
				tv: resolve(__dirname, 'src/pages/tv.html'),
			},
		},
		// Inline assets to reduce HTTP requests
		assetsInlineLimit: 10000, // 10kb - inline smaller assets
	},
	server: {
		port: 5173,
		open: false,
	},
	publicDir: '../../public',
})

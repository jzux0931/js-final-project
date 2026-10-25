import { defineConfig } from 'vite';

const isWsl = process.platform === 'linux' && Boolean(process.env.WSL_DISTRO_NAME);

export default defineConfig({
  // Las rutas relativas permiten publicar dist tanto en la raíz como bajo una ruta de GitHub Pages.
  base: './',
  server: {
    watch: {
      // Polling solo es necesario en algunos sistemas de archivos montados desde WSL.
      usePolling: isWsl,
    }
  }
});

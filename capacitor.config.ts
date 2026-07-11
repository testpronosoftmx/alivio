import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pronosoftmx.alivio',
  appName: 'Alivio',
  webDir: 'public',
  server: {
    // En producción, cargar la app desde los assets locales (sin servidor externo)
    // hostname: 'alivio.pronosoftmx.com', // descomenta si quieres cargar desde la web en dev
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'alivio-key'
    },
    // Permite mixed content (necesario para APIs externas como Supabase, Anthropic)
    allowMixedContent: true,
    // Oculta la barra de navegación del WebView para experiencia fullscreen
    captureInput: true,
    // Mantiene la orientación portrait tal como define el manifest
    initialFocus: true
  },
  plugins: {
    Browser: {
      // Opciones por defecto del plugin Browser para las donaciones in-app
    }
  }
};

export default config;

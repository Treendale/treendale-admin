import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['basis-gusto-pushchair.ngrok-free.dev', '.ngrok-free.dev', 'mjpcs-27-34-111-153.free.pinggy.net'],
  },
});

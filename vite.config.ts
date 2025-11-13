import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: You must replace 'filecraft-app' with the name of your GitHub repository.
  // For example, if your repo URL is https://github.com/your-username/my-awesome-app,
  // then you should set base to '/my-awesome-app/'.
  base: '/filecraft-app/', 
})

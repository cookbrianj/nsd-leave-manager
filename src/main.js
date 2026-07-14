import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import App from './App.vue'
import router from './router'

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'nsdLight',
    themes: {
      nsdLight: {
        dark: false,
        colors: {
          background: '#f8fafc', // Crisp modern light slate
          surface: '#ffffff', // Clean white cards
          'surface-variant': '#f1f5f9', // Light grey dividers/variant surfaces
          primary: '#e5a823', // Rich Wildcat Gold for readable light text contrast
          'primary-darken-1': '#b88100',
          secondary: '#1e293b', // Deep charcoal/slate for high-contrast text and actions
          'secondary-darken-1': '#0f172a',
          accent: '#ffd100',
          error: '#dc2626',
          info: '#2563eb',
          success: '#16a34a',
          warning: '#d97706',
          'on-background': '#0f172a',
          'on-surface': '#0f172a',
        },
      },
    },
  },
})

const app = createApp(App)
app.use(vuetify)
app.use(router)
app.mount('#app')

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
    defaultTheme: 'nsdDark',
    themes: {
      nsdDark: {
        dark: true,
        colors: {
          background: '#0f1117',
          surface: '#1a1d27',
          'surface-variant': '#242836',
          primary: '#6c8cff',
          'primary-darken-1': '#4a6ae0',
          secondary: '#7c4dff',
          'secondary-darken-1': '#5a2dcc',
          accent: '#00e5ff',
          error: '#ff5252',
          info: '#448aff',
          success: '#69f0ae',
          warning: '#ffd740',
          'on-background': '#e8eaf6',
          'on-surface': '#e8eaf6',
        },
      },
    },
  },
})

const app = createApp(App)
app.use(vuetify)
app.use(router)
app.mount('#app')

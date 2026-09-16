import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#0b1320',
          surface: '#0f172a',
          primary: '#0d9488',
          'primary-darken-1': '#0f766e',
          secondary: '#0284c7',
          error: '#ef4444',
          info: '#0284c7',
          success: '#10b981',
          warning: '#f59e0b',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})

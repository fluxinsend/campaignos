import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#0b0d14',
        s1:      '#111420',
        s2:      '#171a2e',
        s3:      '#1e2238',
        border:  '#252a45',
        border2: '#2e3556',
        accent:  '#5b73ff',
        text:    '#dde2f5',
        muted:   '#6b7599',
        green:   '#22c97a',
        warn:    '#f59e0b',
        red:     '#f16b6b',
        cyan:    '#22d3ee',
      },
    },
  },
  plugins: [],
}

export default config

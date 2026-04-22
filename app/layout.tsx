// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CampaignOS',
  description: 'Campaign management for outreach teams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e2238',
              color: '#dde2f5',
              border: '1px solid #2e3556',
              borderRadius: '9px',
              fontSize: '12px',
            },
          }}
        />
      </body>
    </html>
  )
}

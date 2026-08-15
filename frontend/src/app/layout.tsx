import './globals.css'
import React from 'react'
import { CityProvider } from '@/context/CityContext'
import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'VayuBudhi — Air Quality Intelligence',
  description: 'Calibrated decision layer for urban air quality enforcement and forecasting.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>
        <CityProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
          </div>
        </CityProvider>
      </body>
    </html>
  )
}

import './globals.css'
import React from 'react'
import { CityProvider } from '@/context/CityContext'
import { SimulationProvider } from '@/context/SimulationContext'
import { AuthProvider } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import EntrySplash from '@/components/EntrySplash'
import ThemeToggle from '@/components/ThemeToggle'
import AuthBadge from '@/components/AuthBadge'

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
        <AuthProvider>
          <CityProvider>
            <SimulationProvider>
              <EntrySplash />
              <div className="global-top-right-controls">
                <AuthBadge />
                <ThemeToggle />
              </div>
              <div className="app-layout">
                <Sidebar />
                <main className="main-content">{children}</main>
              </div>
            </SimulationProvider>
          </CityProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

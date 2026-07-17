import './globals.css'
import React from 'react'

export const metadata = {
  title: 'VayuBudhi — Commander Dashboard',
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
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

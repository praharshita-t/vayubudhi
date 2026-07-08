import './globals.css'
import React from 'react'

export const metadata = {
  title: 'VayuBudhi Commander Dashboard',
  description: 'Operations control and atmospheric forecasting system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}

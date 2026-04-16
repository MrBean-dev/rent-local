import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RentLocal — Equipment Rentals Near You',
  description: 'Rent trailers, backhoes, excavators, and tools from locals in your area.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RentLocal',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#f05b00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
          <Navbar />
          {/* pb-20 on mobile leaves room for the bottom nav bar */}
          <main className="min-h-screen pb-20 sm:pb-0">{children}</main>
          <footer className="hidden sm:block bg-white border-t border-gray-200 mt-16 py-8 text-center text-sm text-gray-500">
            <p>RentLocal &mdash; Equipment Rentals Near You</p>
          </footer>
          <BottomNav />
          <ServiceWorkerRegistrar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

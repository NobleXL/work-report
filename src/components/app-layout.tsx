'use client'

import { TopNav, BottomNav } from './nav'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="container max-w-4xl mx-auto px-4 py-4 md:px-6 md:py-6 pb-20 md:pb-6">
        {children}
      </main>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </>
  )
}

export function showToast(msg: string) {
  toast(msg)
}

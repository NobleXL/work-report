import type { Metadata } from 'next'
import './globals.css'
import { AppLayout } from '@/components/app-layout'

export const metadata: Metadata = {
  title: '工作量日报系统',
  description: '施工工作量日报与工分统计',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface PhoneEntry {
  name: string
  phone: string
}

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [phoneEntries, setPhoneEntries] = useState<PhoneEntry[]>([{ name: '', phone: '' }])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/wechat/config')
      .then((r) => r.json())
      .then((data) => {
        setWebhookUrl(data.webhook_url || '')
        const map = data.phone_map || {}
        const entries = Object.entries(map).map(([name, phone]) => ({ name, phone: phone as string }))
        if (entries.length) setPhoneEntries(entries)
      })
      .catch(() => toast.error('加载配置失败'))
      .finally(() => setLoading(false))
  }, [])

  function addEntry() {
    setPhoneEntries((prev) => [...prev, { name: '', phone: '' }])
  }

  function removeEntry(index: number) {
    setPhoneEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function updateEntry(index: number, field: 'name' | 'phone', value: string) {
    setPhoneEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    )
  }

  async function handleSave() {
    if (!webhookUrl.trim()) { toast.error('请填写 Webhook 地址'); return }

    setSaving(true)
    const phoneMap: Record<string, string> = {}
    for (const entry of phoneEntries) {
      if (entry.name.trim() && entry.phone.trim()) {
        phoneMap[entry.name.trim()] = entry.phone.trim()
      }
    }

    try {
      const res = await fetch('/api/wechat/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl.trim(), phone_map: phoneMap }),
      })
      if (!res.ok) throw new Error('保存失败')
      toast.success('配置已保存')
    } catch (err: any) {
      toast.error('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">🔔 通知设置</h1>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">企业微信机器人</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-4">
          <div>
            <Label>Webhook 地址</Label>
            <Input
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              在企业微信群 → 添加群机器人 → 获取 Webhook 地址
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">人员手机号映射</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            添加作业人员姓名和对应手机号，发送通知时会根据日报中的作业人员 @ 对应的人
          </p>

          {phoneEntries.map((entry, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                placeholder="姓名"
                value={entry.name}
                onChange={(e) => updateEntry(idx, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="手机号"
                value={entry.phone}
                onChange={(e) => updateEntry(idx, 'phone', e.target.value)}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => removeEntry(idx)}
                disabled={phoneEntries.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addEntry} className="w-full">
            <Plus className="h-4 w-4 mr-1" />添加人员
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
        <Save className="h-4 w-4 mr-1" />{saving ? '保存中…' : '保存配置'}
      </Button>
    </div>
  )
}

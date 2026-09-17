/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Bell, Loader2, Mail, Server, Webhook } from 'lucide-react'
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { ROLE } from '@/lib/roles'

import { updateUserSettings } from '../../api'
import { NOTIFICATION_METHODS } from '../../constants'
import { normalizeUserSettings } from '../../lib/user-settings'
import type { UserProfile, NotifyType } from '../../types'

const NOTIFICATION_ICONS: Record<NotifyType, typeof Mail> = {
  email: Mail,
  webhook: Webhook,
  bark: Bell,
  gotify: Server,
}

// ============================================================================
// Settings Tab Component
// ============================================================================

interface NotificationTabProps {
  profile: UserProfile | null
  onUpdate: () => void
}

export function NotificationTab({ profile, onUpdate }: NotificationTabProps) {
  const { t } = useTranslation()
  const deepSpaceDark = useDeepSpaceDark()
  const isAdmin = (profile?.role ?? 0) >= ROLE.ADMIN
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState(() => normalizeUserSettings())

  // Update form field helper
  const updateField = useCallback(
    <K extends keyof typeof settings>(
      field: K,
      value: (typeof settings)[K]
    ) => {
      setSettings((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  useEffect(() => {
    if (profile?.setting) {
      setSettings(normalizeUserSettings(profile.setting))
    }
  }, [profile])

  const handleSave = async () => {
    try {
      setLoading(true)
      const { record_ip_log: _recordIpLog, ...notificationSettings } = settings
      const response = await updateUserSettings(notificationSettings)

      if (response.success) {
        toast.success(t('Settings updated successfully'))
        onUpdate()
      } else {
        toast.error(response.message || t('Failed to update settings'))
      }
    } catch {
      toast.error(t('Failed to update settings'))
    } finally {
      setLoading(false)
    }
  }

  const notifyType = settings.notify_type

  if (deepSpaceDark) {
    // Render 12-渲染稿-v6-个人资料.html lines 470-510 verbatim: two-column
    // settings grid — notification channel tiles + threshold / email fields
    // on the left, preference switches + save button on the right. The
    // webhook / bark / gotify fields are outside the render and keep their
    // conditional display styled to match.
    const finStyle = {
      height: 38,
      borderRadius: 9,
      border: '1px solid var(--ds-line)',
      background: 'rgba(255,255,255,0.03)',
      color: 'var(--ds-t1)',
      fontSize: 13,
    } as const
    const fld = (label: string, node: ReactNode) => (
      <div className='mt-2.5'>
        <div
          className='mb-[7px] flex items-center gap-1.5'
          style={{
            fontSize: 11,
            color: 'var(--ds-t3)',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </div>
        {node}
      </div>
    )
    const prefRow = (
      title: string,
      desc: string,
      id: string,
      checked: boolean,
      onCheckedChange: (checked: boolean) => void
    ) => (
      <div
        className='flex items-center gap-3 py-[9px] [&:not(:last-of-type)]:border-b'
        style={{ borderColor: 'var(--ds-line)' }}
      >
        <div>
          <div className='font-[550]' style={{ fontSize: 12.5, color: 'var(--ds-t1)' }}>
            {title}
          </div>
          <div className='mt-[3px]' style={{ fontSize: 11, color: 'var(--ds-t3)' }}>
            {desc}
          </div>
        </div>
        <Switch
          id={id}
          className='ml-auto shrink-0'
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
    )
    const sgLabel = (text: string) => (
      <div
        className='mb-[9px] flex items-center gap-2 font-semibold'
        style={{ fontSize: 12.5, color: 'var(--ds-t2)' }}
      >
        {text}
      </div>
    )
    return (
      <div className='grid gap-6 xl:grid-cols-2'>
        <div>
          {sgLabel(t('Notification Method'))}
          <ToggleGroup
            value={[notifyType]}
            onValueChange={(value) => {
              const nextValue = value.find((item) => item !== notifyType)
              if (nextValue) updateField('notify_type', nextValue as NotifyType)
            }}
            aria-label={t('Notification Method')}
            variant='outline'
            size='lg'
            spacing={2}
            className='grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4'
          >
            {NOTIFICATION_METHODS.map((method) => {
              const Icon = NOTIFICATION_ICONS[method.value]
              return (
                <ToggleGroupItem
                  key={method.value}
                  value={method.value}
                  className='ds-ntile w-full flex-col gap-1.5 px-2 py-3'
                >
                  <Icon className='h-4 w-4' />
                  <span className='max-w-full truncate'>{t(method.label)}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
          {fld(
            `${t('Quota Warning Threshold')} · ${t('Get notified when balance falls below this value')}`,
            <Input
              type='number'
              value={settings.quota_warning_threshold}
              onChange={(e) =>
                updateField('quota_warning_threshold', Number(e.target.value))
              }
              placeholder={t('Enter threshold')}
              style={finStyle}
            />
          )}
          {notifyType === 'email' &&
            fld(
              `${t('Notification Email')} · ${t('Leave empty to use account email')}`,
              <Input
                type='email'
                value={settings.notification_email}
                onChange={(e) => updateField('notification_email', e.target.value)}
                placeholder='you@example.com'
                style={finStyle}
              />
            )}
          {notifyType === 'webhook' && (
            <>
              {fld(
                t('Webhook URL'),
                <Input
                  type='url'
                  value={settings.webhook_url}
                  onChange={(e) => updateField('webhook_url', e.target.value)}
                  placeholder={t('https://example.com/webhook')}
                  style={finStyle}
                />
              )}
              {fld(
                t('Webhook Secret'),
                <PasswordInput
                  value={settings.webhook_secret}
                  onChange={(e) => updateField('webhook_secret', e.target.value)}
                  placeholder={t('Enter secret key')}
                  style={finStyle}
                />
              )}
            </>
          )}
          {notifyType === 'bark' &&
            fld(
              t('Bark Push URL'),
              <Input
                type='url'
                value={settings.bark_url}
                onChange={(e) => updateField('bark_url', e.target.value)}
                placeholder={t('https://api.day.app/yourkey/{{title}}/{{content}}')}
                style={finStyle}
              />
            )}
          {notifyType === 'gotify' && (
            <>
              {fld(
                t('Gotify Server URL'),
                <Input
                  type='url'
                  value={settings.gotify_url}
                  onChange={(e) => updateField('gotify_url', e.target.value)}
                  placeholder={t('https://gotify.example.com')}
                  style={finStyle}
                />
              )}
              {fld(
                t('Gotify Application Token'),
                <PasswordInput
                  value={settings.gotify_token}
                  onChange={(e) => updateField('gotify_token', e.target.value)}
                  placeholder={t('Enter application token')}
                  style={finStyle}
                />
              )}
            </>
          )}
        </div>
        <div>
          {sgLabel(t('Preferences'))}
          <div>
            {prefRow(
              t('Accept Unpriced Models'),
              t('Allow using models without price configuration'),
              'acceptUnsetPrice',
              settings.accept_unset_model_ratio_model,
              (checked) => updateField('accept_unset_model_ratio_model', checked)
            )}
            {isAdmin &&
              prefRow(
                t('Receive Upstream Model Update Notifications'),
                t(
                  'Only available for admins. When enabled, you will receive a summary notification via your selected method when the scheduled model check detects upstream model changes or check failures.'
                ),
                'upstreamModelUpdateNotify',
                settings.upstream_model_update_notify_enabled,
                (checked) =>
                  updateField('upstream_model_update_notify_enabled', checked)
              )}
          </div>
          <div className='mt-2 flex justify-end'>
            <Button
              onClick={handleSave}
              disabled={loading}
              className='ds-btn-primary'
              style={{ height: 38, padding: '0 16px', fontSize: 12.5 }}
            >
              {loading ? t('Saving...') : t('Save Settings')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Notification Type */}
      <div className='space-y-2.5'>
        <Label>{t('Notification Method')}</Label>
        <ToggleGroup
          value={[notifyType]}
          onValueChange={(value) => {
            const nextValue = value.find((item) => item !== notifyType)
            if (nextValue) updateField('notify_type', nextValue as NotifyType)
          }}
          aria-label={t('Notification Method')}
          variant='outline'
          size='lg'
          spacing={2}
          className='grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3'
        >
          {NOTIFICATION_METHODS.map((method) => {
            const Icon = NOTIFICATION_ICONS[method.value]
            return (
              <ToggleGroupItem
                key={method.value}
                value={method.value}
                className='h-auto min-h-14 w-full flex-col gap-1.5 px-3 py-3 sm:min-h-16'
              >
                <Icon className='h-4 w-4 sm:h-5 sm:w-5' />
                <span className='max-w-full truncate text-xs font-medium sm:text-sm'>
                  {t(method.label)}
                </span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

      {/* Warning Threshold */}
      <div className='space-y-1.5'>
        <Label htmlFor='threshold'>{t('Quota Warning Threshold')}</Label>
        <Input
          id='threshold'
          type='number'
          className='h-9'
          value={settings.quota_warning_threshold}
          onChange={(e) =>
            updateField('quota_warning_threshold', Number(e.target.value))
          }
          placeholder={t('Enter threshold')}
        />
        <p className='text-muted-foreground text-xs'>
          {t('Get notified when balance falls below this value')}
        </p>
      </div>

      {/* Email Settings */}
      {notifyType === 'email' && (
        <div className='space-y-1.5'>
          <Label htmlFor='notifyEmail'>{t('Notification Email')}</Label>
          <Input
            id='notifyEmail'
            type='email'
            className='h-9'
            value={settings.notification_email}
            onChange={(e) => updateField('notification_email', e.target.value)}
            placeholder={t('Leave empty to use account email')}
          />
        </div>
      )}

      {/* Webhook Settings */}
      {notifyType === 'webhook' && (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='webhookUrl'>{t('Webhook URL')}</Label>
            <Input
              id='webhookUrl'
              type='url'
              className='h-9'
              value={settings.webhook_url}
              onChange={(e) => updateField('webhook_url', e.target.value)}
              placeholder={t('https://example.com/webhook')}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='webhookSecret'>{t('Webhook Secret')}</Label>
            <PasswordInput
              id='webhookSecret'
              value={settings.webhook_secret}
              onChange={(e) => updateField('webhook_secret', e.target.value)}
              placeholder={t('Enter secret key')}
            />
          </div>
        </>
      )}

      {/* Bark Settings */}
      {notifyType === 'bark' && (
        <div className='space-y-1.5'>
          <Label htmlFor='barkUrl'>{t('Bark Push URL')}</Label>
          <Input
            id='barkUrl'
            type='url'
            className='h-9'
            value={settings.bark_url}
            onChange={(e) => updateField('bark_url', e.target.value)}
            placeholder={t('https://api.day.app/yourkey/{{title}}/{{content}}')}
          />
          <p className='text-muted-foreground text-xs'>
            {t('Template variables:')} {'{{title}}'}, {'{{content}}'}
          </p>
        </div>
      )}

      {/* Gotify Settings */}
      {notifyType === 'gotify' && (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='gotifyUrl'>{t('Gotify Server URL')}</Label>
            <Input
              id='gotifyUrl'
              type='url'
              className='h-9'
              value={settings.gotify_url}
              onChange={(e) => updateField('gotify_url', e.target.value)}
              placeholder={t('https://gotify.example.com')}
            />
            <p className='text-muted-foreground text-xs'>
              {t('Enter the full URL of your Gotify server')}
            </p>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='gotifyToken'>{t('Gotify Application Token')}</Label>
            <PasswordInput
              id='gotifyToken'
              value={settings.gotify_token}
              onChange={(e) => updateField('gotify_token', e.target.value)}
              placeholder={t('Enter application token')}
            />
            <p className='text-muted-foreground text-xs'>
              {t('Token obtained from your Gotify application')}
            </p>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='gotifyPriority'>{t('Message Priority')}</Label>
            <Input
              id='gotifyPriority'
              type='number'
              className='h-9'
              min='0'
              max='10'
              value={settings.gotify_priority}
              onChange={(e) =>
                updateField('gotify_priority', Number(e.target.value))
              }
              placeholder='5'
            />
            <p className='text-muted-foreground text-xs'>
              {t(
                'Priority level from 0 (lowest) to 10 (highest), default is 5'
              )}
            </p>
          </div>
          <div className='bg-muted/50 rounded-lg border p-3 sm:p-4'>
            <h5 className='mb-1.5 text-sm font-medium sm:mb-2'>
              {t('Setup Instructions')}
            </h5>
            <ol className='text-muted-foreground space-y-1 text-xs'>
              <li>{t('1. Create an application in your Gotify server')}</li>
              <li>{t('2. Copy the application token')}</li>
              <li>{t('3. Enter your Gotify server URL and token above')}</li>
            </ol>
            <p className='text-muted-foreground mt-3 text-xs'>
              {t('Learn more:')}{' '}
              <a
                href='https://gotify.net/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline underline-offset-4'
              >
                {t('Gotify Documentation')}
              </a>
            </p>
          </div>
        </>
      )}

      {/* Divider */}
      <div className='border-t' />

      {/* Preferences Section */}
      <div className='space-y-3'>
        <div>
          <h4 className='text-sm font-medium'>{t('Preferences')}</h4>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Configure your account behavior preferences')}
          </p>
        </div>

        {/* Receive Upstream Model Update Notifications (admin only) */}
        {isAdmin && (
          <div className='flex items-start justify-between gap-3 rounded-lg border p-3 sm:items-center sm:p-4'>
            <div className='space-y-0.5'>
              <Label htmlFor='upstreamModelUpdateNotify'>
                {t('Receive Upstream Model Update Notifications')}
              </Label>
              <p className='text-muted-foreground line-clamp-3 text-xs sm:line-clamp-none sm:text-sm'>
                {t(
                  'Only available for admins. When enabled, you will receive a summary notification via your selected method when the scheduled model check detects upstream model changes or check failures.'
                )}
              </p>
            </div>
            <Switch
              id='upstreamModelUpdateNotify'
              className='shrink-0'
              checked={settings.upstream_model_update_notify_enabled}
              onCheckedChange={(checked) =>
                updateField('upstream_model_update_notify_enabled', checked)
              }
            />
          </div>
        )}

        {/* Accept Unset Model Price */}
        <div className='flex items-start justify-between gap-3 rounded-lg border p-3 sm:items-center sm:p-4'>
          <div className='space-y-0.5'>
            <Label htmlFor='acceptUnsetPrice'>
              {t('Accept Unpriced Models')}
            </Label>
            <p className='text-muted-foreground text-xs sm:text-sm'>
              {t('Allow using models without price configuration')}
            </p>
          </div>
          <Switch
            id='acceptUnsetPrice'
            className='shrink-0'
            checked={settings.accept_unset_model_ratio_model}
            onCheckedChange={(checked) =>
              updateField('accept_unset_model_ratio_model', checked)
            }
          />
        </div>
      </div>

      {/* Save Button */}
      <div className='flex justify-end'>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {loading ? t('Saving...') : t('Save Settings')}
        </Button>
      </div>
    </div>
  )
}

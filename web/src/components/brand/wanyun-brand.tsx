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
import { useId } from 'react'

import { cn } from '@/lib/utils'

type WanyunMarkProps = {
  className?: string
  monochrome?: boolean
}

export function WanyunMark({ className, monochrome = false }: WanyunMarkProps) {
  const id = useId().replaceAll(':', '')
  const paint = monochrome ? 'currentColor' : `url(#wanyun-gradient-${id})`

  return (
    <svg
      viewBox='0 0 96 96'
      fill='none'
      aria-hidden='true'
      className={cn('wanyun-mark', className)}
    >
      {!monochrome && (
        <defs>
          <linearGradient
            id={`wanyun-gradient-${id}`}
            x1='14'
            y1='84'
            x2='84'
            y2='20'
            gradientUnits='userSpaceOnUse'
          >
            <stop stopColor='var(--wanyun-gradient-start)' />
            <stop
              offset='.55'
              stopColor='var(--wanyun-gradient-middle)'
            />
            <stop offset='1' stopColor='var(--wanyun-gradient-end)' />
          </linearGradient>
        </defs>
      )}
      <path
        d='M26 76C18 76 13 70 13 63C13 56 19 51 26 53C28 42 38 36 48 36C59 36 67 43 69 52C77 50 84 56 84 64C84 70 80 76 74 76H26Z'
        stroke={paint}
        strokeWidth='5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M50 37A13 13 0 1 0 62 53A10 10 0 0 1 50 37Z'
        fill={paint}
      />
      <path
        d='M78 18L80 23L85 25L80 27L78 32L76 27L71 25L76 23L78 18Z'
        fill={monochrome ? 'currentColor' : 'var(--wanyun-gradient-start)'}
      />
    </svg>
  )
}

type WanyunBrandProps = {
  className?: string
  monochrome?: boolean
  variant?: 'hero' | 'compact' | 'inline'
}

export function WanyunBrand({
  className,
  monochrome = false,
  variant = 'inline',
}: WanyunBrandProps) {
  return (
    <span
      className={cn(
        'wanyun-brand',
        `wanyun-brand--${variant}`,
        monochrome && 'wanyun-brand--mono',
        className
      )}
      aria-label='WanYun'
    >
      {/* 登录页品牌区（hero）只要字标；图标只用于侧栏/顶栏等原有图标位。 */}
      {variant !== 'hero' && <WanyunMark monochrome={monochrome} />}
      <span className='wanyun-brand__copy'>
        <span className='wanyun-brand__wordmark'>WanYun</span>
      </span>
    </span>
  )
}

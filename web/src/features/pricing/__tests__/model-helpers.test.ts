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
import { describe, expect, it } from 'vitest'

import type { PricingModel } from '../types'
import { getGroupsWithModels } from '../lib/model-helpers'

const usableGroup = {
  default: { desc: '', ratio: 1 },
  Defaut: { desc: '', ratio: 1 },
  vip: { desc: '', ratio: 0.8 },
  auto: { desc: '', ratio: 1 },
}

function model(enableGroups: string[]): PricingModel {
  return {
    model_name: 'm',
    enable_groups: enableGroups,
  } as PricingModel
}

describe('getGroupsWithModels', () => {
  it('drops groups that host no models (e.g. the Defaut base group)', () => {
    const models = [model(['default']), model(['default', 'vip'])]
    expect(getGroupsWithModels(models, usableGroup)).toEqual([
      'default',
      'vip',
    ])
  })

  it('returns an empty list when no model exists', () => {
    expect(getGroupsWithModels([], usableGroup)).toEqual([])
  })

  it('tolerates models whose enable_groups is not an array', () => {
    const models = [{ model_name: 'm', enable_groups: undefined }]
    expect(
      getGroupsWithModels(models as unknown as PricingModel[], usableGroup)
    ).toEqual([])
  })

  it('always excludes the reserved auto group', () => {
    const models = [model(['auto', 'default'])]
    expect(getGroupsWithModels(models, usableGroup)).toEqual(['default'])
  })
})

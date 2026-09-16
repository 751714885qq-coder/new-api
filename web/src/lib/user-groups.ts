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
// service/group.go injects the signed-in user's own group into
// GetUserUsableGroups with this hardcoded description when the group is not
// part of the global UserUsableGroups setting. The injected entry has no
// channel binding, so group pickers must not offer or preselect it — doing
// so creates tokens that can never reach a channel.
export const INJECTED_OWN_GROUP_DESC = '用户分组'

export function isInjectedOwnGroup(desc: string | undefined): boolean {
  return desc === INJECTED_OWN_GROUP_DESC
}

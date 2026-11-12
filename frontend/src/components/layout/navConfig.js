/**
 * components/layout/navConfig.js
 *
 * Navigation configuration for MONVEX.
 * Each item maps to a route and specifies which roles can see it.
 *
 * The sidebar renders only items where the user's role is in `roles`.
 * This is a UX convenience — the backend remains the security boundary.
 */

import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ScrollText,
  ShieldCheck,
  Users,
  Settings,
} from 'lucide-react'

/**
 * @typedef {Object} NavItem
 * @property {string} label - Display text
 * @property {string} path - Route path
 * @property {React.ComponentType} icon - Lucide icon
 * @property {string[]} roles - Which roles can see this item
 */

/** @type {NavItem[]} */
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'ACCOUNT_HOLDER', 'AUDITOR'],
  },
  {
    label: 'Accounts',
    path: '/accounts',
    icon: Wallet,
    roles: ['ADMIN', 'ACCOUNT_HOLDER', 'AUDITOR'],
  },
  {
    label: 'Transactions',
    path: '/transactions',
    icon: ArrowLeftRight,
    roles: ['ADMIN', 'ACCOUNT_HOLDER', 'AUDITOR'],
  },
  {
    label: 'Audit Log',
    path: '/audit',
    icon: ScrollText,
    roles: ['ADMIN', 'AUDITOR'],
  },
  {
    label: 'Users',
    path: '/users',
    icon: Users,
    roles: ['ADMIN', 'AUDITOR'],
  },
  {
    label: 'Reconciliation',
    path: '/reconciliation',
    icon: ShieldCheck,
    roles: ['ADMIN', 'AUDITOR'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: ['ADMIN', 'ACCOUNT_HOLDER', 'AUDITOR'],
  },
]

/**
 * Filter nav items by the user's role.
 * @param {string} role
 * @returns {NavItem[]}
 */
export function getNavItemsForRole(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

import { type SidebarData, type SidebarNavItem } from '@cincoders/cinnamon';
import { ShieldCheck, User } from 'lucide-react';
import { Links } from './enums';
import cincodersLogo from '../assets/icons/logo_cincoders-icon.svg';

export const sidebar: SidebarData = {
  appName: 'CIn Portal',
  appLogoSrc: cincodersLogo,
  navMain: [
    {
      id: 'profile',
      title: 'Meu Perfil',
      href: Links.PROFILE,
      IconComponent: User,
    },
  ],
};

const adminItem: SidebarNavItem = {
  id: 'admin',
  title: 'Painel Admin',
  href: Links.ADMIN,
  IconComponent: ShieldCheck, 
};

export function buildSidebar(isAdmin: boolean): SidebarData {
  return isAdmin ? { ...sidebar, navMain: [...sidebar.navMain, adminItem] } : sidebar;
}
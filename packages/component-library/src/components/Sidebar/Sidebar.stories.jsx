import React from 'react';
import { LayoutDashboard, ClipboardList, Lightbulb, BookOpen, Settings } from 'lucide-react';
import { Sidebar } from './Sidebar';

export default {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Left icon navigation rail. Hover to expand. Collapses to 74px icon-only at rest.' } },
  },
};

const sampleNavItems = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Home', isActive: true },
  { to: '/audit', icon: <ClipboardList size={18} />, label: 'Personnel Audit', isActive: false },
  { to: '/interventions', icon: <Lightbulb size={18} />, label: 'Interventions', isActive: false },
  { to: '/guide', icon: <BookOpen size={18} />, label: 'User Guide', isActive: false },
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings', isActive: false },
];

const sampleUser = {
  fullName: 'Maria Santos',
  position: 'Human Resource Management Officer',
  location: 'NCR • Division of Caloocan',
};

export const Default = {
  args: {
    appTitle: 'DepEd Personnel Audit',
    appSubtitle: 'Division vacancy monitoring',
    user: sampleUser,
    navItems: sampleNavItems,
    theme: 'light',
    onThemeToggle: () => alert('Theme toggled'),
    onSignOut: () => alert('Sign out clicked'),
    footerNote: "Access is scoped to the HRMO's assigned region and division. Collaborators inherit the same region and division from the assigning HRMO.",
  },
};

export const DarkMode = {
  args: {
    ...Default.args,
    theme: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

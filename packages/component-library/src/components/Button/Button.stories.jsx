import React from 'react';
import { Plus, RotateCcw, LogOut, Trash2 } from 'lucide-react';
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'teal', 'save-active', 'save-disabled', 'undo', 'danger'],
    },
  },
  parameters: {
    docs: { description: { component: 'All button variants used across insighted-dpa — primary, secondary (glass), teal (add/submit), save-active, save-disabled, undo (amber), and danger (red).' } },
  },
};

export const Primary = { args: { variant: 'primary', children: 'Save Changes' } };
export const Secondary = { args: { variant: 'secondary', children: 'Cancel' } };
export const Teal = { args: { variant: 'teal', children: 'Add Intervention', icon: <Plus size={16} /> } };
export const SaveActive = { args: { variant: 'save-active', children: 'Save 3 Changes' } };
export const SaveDisabled = { args: { variant: 'save-disabled', children: 'Save Changes', disabled: true } };
export const Undo = { args: { variant: 'undo', children: 'Undo Changes', icon: <RotateCcw size={14} /> } };
export const Danger = { args: { variant: 'danger', children: 'Confirm Delete', icon: <Trash2 size={16} /> } };

export const Loading = {
  args: { variant: 'teal', children: 'Submitting…', loading: true, loadingText: 'Submitting…' },
};

export const AllVariants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="teal" icon={<Plus size={16} />}>Add Intervention</Button>
    <Button variant="save-active">Save 2 Changes</Button>
    <Button variant="save-disabled" disabled>Save Changes</Button>
    <Button variant="undo" icon={<RotateCcw size={14} />}>Undo Changes</Button>
    <Button variant="danger" icon={<Trash2 size={16} />}>Delete</Button>
    <Button variant="secondary" icon={<LogOut size={16} />} style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.2)', background: 'rgba(254,226,226,0.4)' }}>
      Sign Out
    </Button>
  </div>
);

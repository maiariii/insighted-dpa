import React from 'react';
import { CheckCircle2, Edit3, Calendar, FileSpreadsheet, Lock, Users, Monitor, KeyRound } from 'lucide-react';
import { UserGuide } from './UserGuide';

export default {
  title: 'Components/UserGuide',
  component: UserGuide,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Accordion-based user guide with font-scale magnifier and Expand/Collapse All. ' +
          'Content is passed via `sections` prop — the structural shell is fully reusable.',
      },
    },
  },
};

const SAMPLE_SECTIONS = [
  {
    key: 'section1',
    title: 'Accessing the Portal (Login & Registration)',
    subtitle: 'Official email domain requirements, registration procedure, and sign-in steps.',
    content: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ padding: '16px', background: 'rgba(248,250,252,0.8)', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '8px', fontWeight: '700', marginBottom: '8px' }}>
            <span style={{ background: '#0d9488', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>A</span>
            Step 1: Registration
          </div>
          <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: 1.7 }}>
            <li>Click <strong>Register HRMO Account</strong> on the login screen.</li>
            <li>Enter your First Name, Last Name, and Position Title.</li>
            <li>Select your assigned <strong>Region</strong> and <strong>Division Office</strong>.</li>
            <li>Create a strong password (minimum 8 characters).</li>
          </ul>
        </div>
        <div style={{ padding: '16px', background: 'rgba(248,250,252,0.8)', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '8px', fontWeight: '700', marginBottom: '8px' }}>
            <span style={{ background: '#0d9488', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>B</span>
            Step 2: Signing In
          </div>
          <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: 1.7 }}>
            <li>Provide your valid <code style={{ color: '#0d9488', fontWeight: '700' }}>@deped.gov.ph</code> email.</li>
            <li>Enter your registered account password.</li>
            <li>Click <strong>Sign In to Portal</strong> to load your Division's live audit ledger.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    key: 'section2',
    title: 'Doing the Personnel Audit (Grid Ledger Rules)',
    subtitle: 'Editing permissions, uppercase name auto-transformation, and popover date entry rules.',
    content: (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { Icon: Edit3, color: '#d97706', bg: '#fffbeb', label: 'Editable Fields', text: 'HRMOs can only edit fields to the RIGHT of Position Status.' },
          { Icon: Calendar, color: '#7c3aed', bg: '#faf5ff', label: 'Popover Calendars', text: 'All date cells require selecting from the interactive calendar popover.' },
          { Icon: FileSpreadsheet, color: '#0d9488', bg: '#f0fdfa', label: 'Dirty Cell Indicator', text: 'A yellow corner mark appears on edited cells. Click Save before switching tabs.' },
        ].map(({ Icon, color, bg, label, text }) => (
          <div key={label} style={{ padding: '14px', background: bg, borderRadius: '12px', border: `1px solid ${color}40` }}>
            <div style={{ display: 'flex', gap: '8px', color, fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>
              <Icon size={16} /> {label}
            </div>
            <p style={{ margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export const Default = {
  args: {
    title: 'DepEd Personnel Audit — User Guide',
    subtitle: 'Step-by-step documentation designed for HRMOs, Auditors, and Division Personnel.',
    badgeLabel: 'Interactive Help Desk & Workflow Guide',
    sections: SAMPLE_SECTIONS,
  },
};

export const DarkMode = {
  args: Default.args,
  parameters: { backgrounds: { default: 'dark' } },
};

export const SingleSection = {
  args: {
    ...Default.args,
    sections: [SAMPLE_SECTIONS[0]],
  },
};

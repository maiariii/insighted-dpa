import '../src/tokens.css';
import React, { useState } from 'react';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      // Match the app's glassmorphic gradient background
      default: 'light',
      values: [
        {
          name: 'light',
          value:
            'radial-gradient(circle at 4% 6%, rgba(147, 197, 253, 0.72), transparent 34%), ' +
            'radial-gradient(circle at 76% 16%, rgba(247, 201, 72, 0.62), transparent 28%), ' +
            'linear-gradient(135deg, #dbeafe 0%, #eff6ff 30%, #bfdbfe 62%, #93c5fd 100%)',
        },
        {
          name: 'dark',
          value:
            'radial-gradient(circle at 8% 8%, rgba(247, 201, 72, 0.22), transparent 28%), ' +
            'radial-gradient(circle at 72% 86%, rgba(39, 131, 222, 0.24), transparent 30%), ' +
            'linear-gradient(135deg, #111827 0%, #172033 48%, #2a1518 100%)',
        },
      ],
    },
  },

  // Global decorator: sync dark/light class on <body> for CSS token dark-mode overrides
  decorators: [
    (Story, context) => {
      const bg = context.globals.backgrounds?.value ?? '';
      const isDark = bg.includes('#111827') || bg.includes('#172033');
      React.useEffect(() => {
        document.body.classList.toggle('dark', isDark);
        return () => document.body.classList.remove('dark');
      }, [isDark]);

      return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: 'transparent' }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;

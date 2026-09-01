import React, { useState } from 'react';
import { HeroCard } from './HeroCard';

export default {
  title: 'Components/HeroCard',
  component: HeroCard,
  parameters: {
    docs: { description: { component: 'Top header banner with eyebrow label, large title, subtitle, and an optional Refresh Data action.' } },
  },
};

export const Default = {
  args: {
    eyebrowPrimary: 'Department of Education',
    eyebrowSecondary: 'HROD & Infrastructure',
    title: 'DepEd Personnel Audit',
    subtitle: 'Live summary of unfilled plantilla items and vacancy reasons.',
  },
};

export const WithRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };
  return (
    <HeroCard
      eyebrowPrimary="Department of Education"
      eyebrowSecondary="HROD & Infrastructure"
      title="DepEd Personnel Audit"
      subtitle="Live summary of unfilled plantilla items and vacancy reasons."
      onRefresh={handleRefresh}
      isRefreshing={refreshing}
    />
  );
};

export const AuditPanel = {
  args: {
    eyebrowPrimary: 'Department of Education',
    eyebrowSecondary: 'HROD & Infrastructure',
    title: 'Personnel Audit Main Panel',
    subtitle: 'Item Number and Position Title stay frozen during horizontal scroll.',
  },
};

export const InterventionsPage = {
  args: {
    eyebrowPrimary: 'Department of Education',
    eyebrowSecondary: 'HROD & Infrastructure',
    title: 'Interventions Workspace',
    subtitle: 'Part II: Strategic actions designed to accelerate vacancy processing.',
  },
};

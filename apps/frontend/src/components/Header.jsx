import React from 'react';

export const Header = ({ title = 'DepEd Personnel Audit', subtitle = 'Live summary of unfilled plantilla items and vacancy reasons.' }) => {
  return (
    <header className="portal-header">
      <div className="topbar">
        <div className="eyebrow">
          <span className="eyebrow-primary">Department of Education</span>
          <span className="eyebrow-divider">|</span>
          <span className="eyebrow-secondary">HROD &amp; Infrastructure</span>
        </div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
};

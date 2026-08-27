import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  MessageSquarePlus,
  Target,
  Users,
  Lock,
  Monitor,
  Sparkles,
  HelpCircle,
  Calendar,
  Type,
  Edit3
} from 'lucide-react';

export const UserGuide = () => {
  // Load initial font scale from localStorage or default to 1.0
  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem('dpa_guide_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Track expanded accordion sections (default section 1 open)
  const [expandedSections, setExpandedSections] = useState({
    section1: true,
    section2: false,
    section3: false,
    section4: false,
    section5: false,
  });

  // Save font scale to localStorage when changed
  useEffect(() => {
    localStorage.setItem('dpa_guide_font_scale', fontScale.toString());
  }, [fontScale]);

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const expandAll = () => {
    setExpandedSections({
      section1: true,
      section2: true,
      section3: true,
      section4: true,
      section5: true,
    });
  };

  const collapseAll = () => {
    setExpandedSections({
      section1: false,
      section2: false,
      section3: false,
      section4: false,
      section5: false,
    });
  };

  // Helper text class based on scale
  const getTextSizeClass = () => {
    if (fontScale >= 1.4) return 'text-lg leading-relaxed';
    if (fontScale >= 1.2) return 'text-base leading-relaxed';
    return 'text-sm leading-relaxed';
  };

  const getSubtextSizeClass = () => {
    if (fontScale >= 1.4) return 'text-base';
    if (fontScale >= 1.2) return 'text-sm';
    return 'text-xs';
  };

  const getHeadingSizeClass = () => {
    if (fontScale >= 1.4) return 'text-xl font-bold';
    if (fontScale >= 1.2) return 'text-lg font-bold';
    return 'text-base font-bold';
  };

  return (
    <div className="space-y-6 pb-12 transition-all duration-300">
      {/* Top Banner & Magnifier Tool */}
      <div className="card-glass p-6 md:p-8 rounded-2xl border border-teal-200/50 dark:border-teal-900/40 bg-gradient-to-br from-teal-500/10 via-slate-50/50 to-amber-500/10 dark:from-teal-950/40 dark:via-slate-900/60 dark:to-amber-950/20 shadow-xl">
        <div className="specular-sheen"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Interactive Help Desk & Workflow Guide
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              DepEd Personnel Audit — User Guide
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base font-medium">
              Step-by-step documentation designed for HRMOs, Auditors, and Division Personnel. Use the magnifier controls below to resize text for comfortable reading.
            </p>
          </div>

          {/* Global Font Magnifier Control Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ZoomIn className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Text Size Controls
              </span>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                {Math.round(fontScale * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFontScale(1.0)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 border ${
                  fontScale === 1.0
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Default Font Size (100%)"
              >
                <span>A</span>
                <span className="text-[10px]">Default</span>
              </button>

              <button
                type="button"
                onClick={() => setFontScale(1.2)}
                className={`px-3 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1 border ${
                  fontScale === 1.2
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Large Font Size (120%)"
              >
                <span>A+</span>
                <span className="text-[10px]">Large</span>
              </button>

              <button
                type="button"
                onClick={() => setFontScale(1.4)}
                className={`px-3 py-2 text-base font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 border ${
                  fontScale === 1.4
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Extra Large Font Size (140%)"
              >
                <span>A++</span>
                <span className="text-[10px]">XL</span>
              </button>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Preference saved locally</span>
              <button
                onClick={() => setFontScale(1.0)}
                className="hover:text-teal-600 dark:hover:text-teal-400 underline flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Quick Toolbar for Accordion Collapse/Expand */}
        <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              5 Core System Modules
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Expand All Sections
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Accordion Sections Stack */}
      <div className="space-y-4">
        {/* SECTION 1: Access & Sign-In */}
        <div className="card-glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('section1')}
            className="w-full p-5 text-left flex items-center justify-between bg-slate-50/50 hover:bg-teal-50/40 dark:bg-slate-900/50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-lg border border-teal-200 dark:border-teal-800">
                1
              </div>
              <div>
                <h2 className={`font-extrabold text-slate-900 dark:text-white ${getHeadingSizeClass()}`}>
                  Accessing the Portal (Login & Registration)
                </h2>
                <p className={`text-slate-500 dark:text-slate-400 ${getSubtextSizeClass()}`}>
                  Official email domain requirements, registration procedure, and sign-in steps.
                </p>
              </div>
            </div>
            <div className="text-slate-400 dark:text-slate-500 p-2">
              {expandedSections.section1 ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </div>
          </button>

          {expandedSections.section1 && (
            <div className="p-6 space-y-5 border-t border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
              {/* Highlight Badge Rule */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide text-xs">
                    Mandatory Rule: DepEd Official Email
                  </span>
                  <p className={`text-emerald-800 dark:text-emerald-300 font-medium ${getTextSizeClass()}`}>
                    All user accounts must register using an official email ending in{' '}
                    <code className="bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-300 dark:border-emerald-700">
                      @deped.gov.ph
                    </code>
                    . Personal domains (@gmail.com, @yahoo.com) are automatically blocked for security compliance.
                  </p>
                </div>
              </div>

              {/* Step Walkthrough */}
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">A</span>
                    Step 1: Registration
                  </div>
                  <ul className={`list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1.5 ${getTextSizeClass()}`}>
                    <li>Click <strong>Register HRMO Account</strong> on the login screen.</li>
                    <li>Enter your First Name, Last Name, and Position Title.</li>
                    <li>Select your assigned <strong>Region</strong> and <strong>Division Office</strong>.</li>
                    <li>Create a strong password (minimum 8 characters).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">B</span>
                    Step 2: Signing In
                  </div>
                  <ul className={`list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1.5 ${getTextSizeClass()}`}>
                    <li>Provide your valid <code className="text-teal-600 dark:text-teal-400 font-bold">@deped.gov.ph</code> email address.</li>
                    <li>Enter your registered account password.</li>
                    <li>Click <strong>Sign In to Portal</strong> to load your Division's live audit ledger.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Personnel Audit */}
        <div className="card-glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('section2')}
            className="w-full p-5 text-left flex items-center justify-between bg-slate-50/50 hover:bg-teal-50/40 dark:bg-slate-900/50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-lg border border-teal-200 dark:border-teal-800">
                2
              </div>
              <div>
                <h2 className={`font-extrabold text-slate-900 dark:text-white ${getHeadingSizeClass()}`}>
                  Doing the Personnel Audit (Grid Ledger Rules)
                </h2>
                <p className={`text-slate-500 dark:text-slate-400 ${getSubtextSizeClass()}`}>
                  Editing permissions, uppercase name auto-transformation, and popover date entry rules.
                </p>
              </div>
            </div>
            <div className="text-slate-400 dark:text-slate-500 p-2">
              {expandedSections.section2 ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </div>
          </button>

          {expandedSections.section2 && (
            <div className="p-6 space-y-5 border-t border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
              <p className={`text-slate-700 dark:text-slate-200 ${getTextSizeClass()}`}>
                The Personnel Audit module displays all unfilled plantilla items within your assigned division. Items are segregated into <strong>Teaching</strong>, <strong>Non-Teaching</strong>, and <strong>Teaching-Related</strong> tabs.
              </p>

              {/* Visual Guidance Badges */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Editable Fields
                  </div>
                  <p className={`text-amber-950 dark:text-amber-200 ${getTextSizeClass()}`}>
                    HRMOs can only edit fields located to the <strong>RIGHT</strong> of <em>Position Status</em> (e.g. Incumbent Name, Date of Vacancy, Reason for Vacancy, Status of Vacancy).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
                    <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Uppercase Names
                  </div>
                  <p className={`text-blue-950 dark:text-blue-200 ${getTextSizeClass()}`}>
                    The <em>Name of Incumbent</em> field automatically converts text into <strong>UPPERCASE</strong> (e.g. "juan dela cruz" becomes "JUAN DELA CRUZ").
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 space-y-2">
                  <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Popover Calendar Pickers
                  </div>
                  <p className={`text-purple-950 dark:text-purple-200 ${getTextSizeClass()}`}>
                    All date cells require selecting from the interactive calendar popover instead of manual typing to guarantee correct date formats.
                  </p>
                </div>
              </div>

              {/* Unsaved Changes Indicator Explanation */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <FileSpreadsheet className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Dirty Cell Highlighting & Save Button States
                  </span>
                  <p className={`text-slate-600 dark:text-slate-300 ${getTextSizeClass()}`}>
                    When you edit a cell, a subtle yellow marker appears in the corner indicating uncommitted changes. The top <strong>Save Changes</strong> button will light up vibrant green. Be sure to click it before switching tabs!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Remarks and Popup Modals */}
        <div className="card-glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('section3')}
            className="w-full p-5 text-left flex items-center justify-between bg-slate-50/50 hover:bg-teal-50/40 dark:bg-slate-900/50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-lg border border-teal-200 dark:border-teal-800">
                3
              </div>
              <div>
                <h2 className={`font-extrabold text-slate-900 dark:text-white ${getHeadingSizeClass()}`}>
                  Audit Remarks & Popup Modal History
                </h2>
                <p className={`text-slate-500 dark:text-slate-400 ${getSubtextSizeClass()}`}>
                  Using the blue "+" button to record timestamped remarks without data loss.
                </p>
              </div>
            </div>
            <div className="text-slate-400 dark:text-slate-500 p-2">
              {expandedSections.section3 ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </div>
          </button>

          {expandedSections.section3 && (
            <div className="p-6 space-y-5 border-t border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <MessageSquarePlus className="w-7 h-7 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm">
                    Structured Audit Logs via Blue "+" Button
                  </h3>
                  <p className={`text-blue-950 dark:text-blue-300 ${getTextSizeClass()}`}>
                    Each plantilla row features a blue <strong>+</strong> button in the <em>Remarks</em> column. Clicking this button opens a modal dialog that preserves historical commentary.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                  How to Record a New Remark:
                </h4>
                <ol className={`list-decimal list-inside text-slate-700 dark:text-slate-300 space-y-2 ${getTextSizeClass()}`}>
                  <li>Locate the target plantilla item row in the audit table.</li>
                  <li>Click the blue <strong>+</strong> button in the Remarks column.</li>
                  <li>In the popup modal, review previous timestamped remarks logged by fellow officers.</li>
                  <li>Type your new update into the text box (e.g. <em>"Endorsement submitted to Regional Office on 08/25/2026"</em>).</li>
                  <li>Click <strong>Save Remark</strong>. The modal appends your note with your name and date stamp safely.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Action Plans (Interventions) */}
        <div className="card-glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('section4')}
            className="w-full p-5 text-left flex items-center justify-between bg-slate-50/50 hover:bg-teal-50/40 dark:bg-slate-900/50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-lg border border-teal-200 dark:border-teal-800">
                4
              </div>
              <div>
                <h2 className={`font-extrabold text-slate-900 dark:text-white ${getHeadingSizeClass()}`}>
                  Action Plans (Interventions Workspace)
                </h2>
                <p className={`text-slate-500 dark:text-slate-400 ${getSubtextSizeClass()}`}>
                  Visual card decks for strategic interventions, expected outcomes, and deletion safety.
                </p>
              </div>
            </div>
            <div className="text-slate-400 dark:text-slate-500 p-2">
              {expandedSections.section4 ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </div>
          </button>

          {expandedSections.section4 && (
            <div className="p-6 space-y-5 border-t border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
              <p className={`text-slate-700 dark:text-slate-200 ${getTextSizeClass()}`}>
                Part II of the system shifts from individual row edits to strategic division-wide action plans designed to resolve long-term unfilled positions.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Visual Card Deck Layout
                  </div>
                  <p className={`text-slate-600 dark:text-slate-300 ${getTextSizeClass()}`}>
                    Interventions are displayed as intuitive cards showcasing the Intervention Category, Target Completion Date, and Responsible Office.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Deletion Safety Gates
                  </div>
                  <p className={`text-slate-600 dark:text-slate-300 ${getTextSizeClass()}`}>
                    To prevent accidental data removal, deleting an intervention card requires confirmation in a safety modal.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Security & Collaborator Invites */}
        <div className="card-glass rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection('section5')}
            className="w-full p-5 text-left flex items-center justify-between bg-slate-50/50 hover:bg-teal-50/40 dark:bg-slate-900/50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-lg border border-teal-200 dark:border-teal-800">
                5
              </div>
              <div>
                <h2 className={`font-extrabold text-slate-900 dark:text-white ${getHeadingSizeClass()}`}>
                  Account Security & Collaborator Invites
                </h2>
                <p className={`text-slate-500 dark:text-slate-400 ${getSubtextSizeClass()}`}>
                  6-digit passcode lock gate and managing helper accounts in your division.
                </p>
              </div>
            </div>
            <div className="text-slate-400 dark:text-slate-500 p-2">
              {expandedSections.section5 ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </div>
          </button>

          {expandedSections.section5 && (
            <div className="p-6 space-y-5 border-t border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-sm">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    6-Digit Security Passcode Gate
                  </div>
                  <p className={`text-amber-950 dark:text-amber-300 ${getTextSizeClass()}`}>
                    Settings and Account configurations are protected behind a 6-digit Security Passcode gate. You must enter your verified passcode before modifying division settings.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-teal-900 dark:text-teal-200 text-sm">
                    <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Adding Collaborator Helpers
                  </div>
                  <p className={`text-teal-950 dark:text-teal-300 ${getTextSizeClass()}`}>
                    Host HRMOs can add collaborator helper accounts. Invited helpers automatically inherit the host HRMO's assigned Region and Division Office boundaries.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACCESSIBILITY FEATURES CARD */}
      <div className="card-glass p-6 md:p-8 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-gradient-to-r from-amber-500/10 via-slate-50/50 to-teal-500/10 dark:from-amber-950/40 dark:via-slate-900/60 dark:to-teal-950/40 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white">
              Accessibility Features
            </h2>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Simple screen and contrast settings to make audit management easier on your eyes.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2">
          {/* Tip 1 */}
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Monitor className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Browser Zoom Keyboard Shortcuts
            </div>
            <p className={`text-slate-600 dark:text-slate-300 ${getTextSizeClass()}`}>
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 font-mono text-xs rounded border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 font-mono text-xs rounded border">+</kbd> to zoom in and make the screen bigger. Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 font-mono text-xs rounded border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 font-mono text-xs rounded border">0</kbd> to return to normal size.
            </p>
          </div>

          {/* Tip 2 */}
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Dark / Light Contrast Switch
            </div>
            <p className={`text-slate-600 dark:text-slate-300 ${getTextSizeClass()}`}>
              Use the <strong>Light Mode / Dark Mode</strong> switch on the sidebar to change display brightness based on your room lighting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;

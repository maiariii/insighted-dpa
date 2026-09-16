import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';

export function PositionBreakdownCards() {
  const { records } = useApp();

  const [filledSlide, setFilledSlide] = useState(0);
  const [unfilledSlide, setUnfilledSlide] = useState(0);

  // Split records strictly into Filled and Unfilled subsets
  // Note: NULL, undefined, or unknown position_status are NOT assumed to be UNFILLED
  const { filledRecords, unfilledRecords } = useMemo(() => {
    const list = Array.isArray(records) ? records : [];
    const filled = [];
    const unfilled = [];

    list.forEach(r => {
      const posStatus = (r.position_status || r['POSITION STATUS'] || '').toString().trim().toUpperCase();

      if (posStatus === 'FILLED') {
        filled.push(r);
      } else if (posStatus === 'UNFILLED') {
        unfilled.push(r);
      }
    });

    return { filledRecords: filled, unfilledRecords: unfilled };
  }, [records]);

  const totalFilled = filledRecords.length;
  const totalUnfilled = unfilledRecords.length;

  // Compute position title frequency breakdown chunked into slides of 5 items
  const computePositionSlides = (recordList) => {
    const counts = {};
    recordList.forEach(r => {
      const rawTitle = r.position_title || r['POSITION TITLE'] || 'Unspecified';
      const title = String(rawTitle).trim() || 'Unspecified';
      counts[title] = (counts[title] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    if (sorted.length === 0) {
      return [{
        title: 'POSITION TITLE',
        items: [{ label: 'No records available', count: 0 }],
        maxOverall: 1
      }];
    }

    const maxOverall = sorted[0]?.count || 1;
    const pageSize = 5;
    const slides = [];

    // Limit to top 10 slides (up to 50 positions) to match HQ dot indicator layout
    const maxItems = Math.min(sorted.length, 50);
    for (let i = 0; i < maxItems; i += pageSize) {
      slides.push({
        title: 'POSITION TITLE',
        items: sorted.slice(i, i + pageSize),
        maxOverall
      });
    }

    return slides;
  };

  const filledSlides = useMemo(() => computePositionSlides(filledRecords), [filledRecords]);
  const unfilledSlides = useMemo(() => computePositionSlides(unfilledRecords), [unfilledRecords]);

  // Render helper for single Card reusing HQ styling and navigation
  const renderCard = ({
    title,
    subtitle = 'after audit',
    total,
    accentColor, // 'emerald' | 'rose'
    slides,
    currentSlide,
    onSlideChange
  }) => {
    const isEmerald = accentColor === 'emerald';
    const totalSlides = slides.length;
    const safeSlide = currentSlide < totalSlides ? currentSlide : 0;
    const activeData = slides[safeSlide] || slides[0];
    const maxCount = activeData.maxOverall || Math.max(...activeData.items.map(i => i.count), 1);

    const handlePrev = () => {
      onSlideChange((safeSlide - 1 + totalSlides) % totalSlides);
    };

    const handleNext = () => {
      onSlideChange((safeSlide + 1) % totalSlides);
    };

    // Optional wheel listener for smooth scrolling through pages
    const lastScrollTime = useRef(0);
    const handleWheel = (e) => {
      if (totalSlides <= 1) return;
      const now = Date.now();
      if (now - lastScrollTime.current < 250) return;
      if (Math.abs(e.deltaY) > 20 || Math.abs(e.deltaX) > 20) {
        lastScrollTime.current = now;
        if (e.deltaY > 0 || e.deltaX > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    return (
      <div
        onWheel={handleWheel}
        className="card-glass relative rounded-2xl p-5 md:p-6 border border-slate-200/90 dark:border-slate-700/90 shadow-sm flex flex-col justify-between overflow-hidden group select-none"
      >
        <div className="specular-sheen"></div>

        {/* Left vertical accent border */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
            isEmerald ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />

        <div className="relative z-10">
          {/* Card Top: Title, Subtitle, and Big Total Count */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 tracking-wider uppercase">
                {title}
              </h3>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 block mt-0.5">
                {subtitle}
              </span>
            </div>
            <div className="text-right">
              <strong className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums block">
                {Number(total).toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/80 dark:border-slate-700/80 my-3.5" />

          {/* Table Header Row: Dimension Name vs Count */}
          <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 dark:text-slate-400 tracking-wider uppercase mb-2.5">
            <span>{activeData.title}</span>
            <span>COUNT</span>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-2.5 min-h-[148px] flex flex-col justify-start">
            {activeData.items.map((item, idx) => {
              const count = item.count || 0;
              const barPercent = Math.min(100, Math.max(4, Math.round((count / maxCount) * 100)));

              return (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs md:text-sm">
                  {/* Position Title Label */}
                  <span
                    className="font-bold text-slate-700 dark:text-slate-200 w-32 md:w-44 flex-shrink-0 truncate"
                    title={item.label}
                  >
                    {item.label}
                  </span>

                  {/* Horizontal Progress Bar */}
                  <div className="flex-1 h-2 md:h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        isEmerald
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : 'bg-gradient-to-r from-rose-400 to-rose-500'
                      }`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>

                  {/* Count Value */}
                  <span className="font-extrabold text-slate-800 dark:text-white text-right w-16 md:w-20 flex-shrink-0 tabular-nums">
                    {Number(count).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Carousel / Slide Pagination Controls */}
        <div className="relative z-10 pt-4 mt-auto flex items-center justify-center gap-2">
          {/* Prev Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition cursor-pointer"
            title="Previous positions"
          >
            ‹
          </button>

          {/* Indicator Dots */}
          <div className="flex items-center gap-1.5 px-1">
            {slides.map((_, idx) => {
              const isActive = idx === safeSlide;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSlideChange(idx)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    isActive
                      ? isEmerald
                        ? 'w-4 h-1.5 bg-emerald-500 shadow-xs'
                        : 'w-4 h-1.5 bg-rose-500 shadow-xs'
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                  title={`Page ${idx + 1}`}
                />
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNext}
            className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition cursor-pointer"
            title="Next positions"
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Filled Positions Card */}
      {renderCard({
        title: 'FILLED POSITIONS',
        subtitle: 'after audit',
        total: totalFilled,
        accentColor: 'emerald',
        slides: filledSlides,
        currentSlide: filledSlide,
        onSlideChange: setFilledSlide
      })}

      {/* Unfilled Positions Card */}
      {renderCard({
        title: 'UNFILLED POSITIONS',
        subtitle: 'after audit',
        total: totalUnfilled,
        accentColor: 'rose',
        slides: unfilledSlides,
        currentSlide: unfilledSlide,
        onSlideChange: setUnfilledSlide
      })}
    </div>
  );
}

export default PositionBreakdownCards;

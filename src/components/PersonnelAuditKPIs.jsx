import React, { useState, useEffect } from "react";
import styles from "./PersonnelAuditKPIs.module.css";

/**
 * PersonnelAuditKPIs Component
 * 
 * Dynamic KPI grid displaying regional audit metrics.
 * 
 * @param {Object} props
 * @param {string} [props.region="NCR"] - Target region filter
 * @param {string} [props.office="Regional Office - Proper"] - Target office filter
 * @param {string} [props.apiEndpoint="/api/personnel-audit/kpis"] - API URL endpoint
 * @param {Object} [props.initialData=null] - Pre-fetched KPI data (optional)
 */
export default function PersonnelAuditKPIs({
  region = "NCR",
  office = "Regional Office - Proper",
  apiEndpoint = "/api/personnel-audit/kpis",
  initialData = null
}) {
  const [kpiData, setKpiData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchKpis = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ region, office }).toString();
        const response = await fetch(`${apiEndpoint}?${query}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        if (isMounted) {
          if (json.success && json.data) {
            setKpiData(json.data);
          } else {
            throw new Error(json.message || "Invalid API response structure");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch Personnel Audit KPIs:", err);
          setError(err.message || "Data temporarily unavailable");
          // Fallback safe state
          setKpiData({
            totalAudited: 0,
            completedAudited: 0,
            accomplishmentRate: 0,
            longTermUnfilled: 0,
            newVacancies: 0
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchKpis();

    return () => {
      isMounted = false;
    };
  }, [region, office, apiEndpoint]);

  // Loading skeleton state
  if (loading && !kpiData) {
    return (
      <div className={styles.kpiGrid} data-testid="kpi-loading-skeleton">
        {[1, 2, 3, 4].map((idx) => (
          <article key={idx} className={`${styles.card} ${styles.kpi}`}>
            <div className={`${styles.skeletonBox} ${styles.skeletonLabel}`} />
            <div className={`${styles.skeletonBox} ${styles.skeletonValue}`} />
            <div className={`${styles.skeletonBox} ${styles.skeletonSubtext}`} />
          </article>
        ))}
      </div>
    );
  }

  // Extract counts with safe nullish coalescing
  const totalAudited = kpiData?.totalAudited ?? 0;
  const completedAudited = kpiData?.completedAudited ?? 0;
  const longTermUnfilled = kpiData?.longTermUnfilled ?? 0;
  const newVacancies = kpiData?.newVacancies ?? 0;

  // Zero division safeguard calculation
  const accomplishmentRate = kpiData?.accomplishmentRate !== undefined
    ? kpiData.accomplishmentRate
    : (totalAudited > 0 ? Math.round((completedAudited / totalAudited) * 100) : 0);

  return (
    <div className={styles.kpiGrid}>
      {error && (
        <div className={styles.errorBanner} role="alert">
          <strong>Notice:</strong> Unable to load live metrics. Displaying default values.
        </div>
      )}

      {/* Card 1: Total unfilled items */}
      <article className={`${styles.card} ${styles.kpi}`}>
        <label>Total unfilled items</label>
        <strong>{totalAudited}</strong>
        <span>
          {error ? "Data temporarily unavailable" : `Filtered to ${region} • ${office}`}
        </span>
      </article>

      {/* Card 2: Completed audit rows */}
      <article className={`${styles.card} ${styles.kpi}`}>
        <label>Completed audit rows</label>
        <strong>{completedAudited}</strong>
        <span>{`${accomplishmentRate}% accomplishment rate`}</span>
      </article>

      {/* Card 3: Long-term unfilled */}
      <article className={`${styles.card} ${styles.kpi}`}>
        <label>Long-term unfilled</label>
        <strong>{longTermUnfilled}</strong>
        <span>Requires priority review</span>
      </article>

      {/* Card 4: New vacancies */}
      <article className={`${styles.card} ${styles.kpi}`}>
        <label>New vacancies</label>
        <strong>{newVacancies}</strong>
        <span>Recently tagged for action</span>
      </article>
    </div>
  );
}

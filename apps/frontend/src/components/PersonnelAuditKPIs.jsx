import React, { useState, useEffect } from "react";
import styles from "./PersonnelAuditKPIs.module.css";

const kpiCacheStore = {};
const CACHE_TTL = 30000;

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
    const fetchKpis = async (forceRefetch = false) => {
      const cacheKey = `${region}|${office}|${apiEndpoint}`;
      const now = Date.now();
      const cachedEntry = kpiCacheStore[cacheKey];

      if (!forceRefetch && cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL)) {
        setKpiData(cachedEntry.data);
        setLoading(false);
        return;
      }

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
          const payload = json.data || json;
          if (json.success !== false) {
            setKpiData(payload);
            kpiCacheStore[cacheKey] = {
              data: payload,
              timestamp: now
            };
          } else {
            throw new Error(json.message || "Invalid API response structure");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch Personnel Audit KPIs:", err);
          setError(err.message || "Data temporarily unavailable");
          setKpiData({
            totalUnfilled: 0,
            auditedItems: 0,
            remainingItems: 0,
            completionPercentage: 0
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

  if (loading && !kpiData) {
    return (
      <div className={styles.kpiGrid} data-testid="kpi-loading-skeleton">
        {[1, 2, 3].map((idx) => (
          <article key={idx} className={`${styles.card} ${styles.kpi}`}>
            <div className={`${styles.skeletonBox} ${styles.skeletonLabel}`} />
            <div className={`${styles.skeletonBox} ${styles.skeletonValue}`} />
            <div className={`${styles.skeletonBox} ${styles.skeletonSubtext}`} />
          </article>
        ))}
      </div>
    );
  }

  const totalUnfilled = kpiData?.totalUnfilled ?? kpiData?.totalAudited ?? 0;
  const auditedItems = kpiData?.auditedItems ?? kpiData?.completedAudited ?? 0;
  const remainingItems = kpiData?.remainingItems ?? Math.max(0, totalUnfilled - auditedItems);

  const completionPercentage = kpiData?.completionPercentage !== undefined
    ? kpiData.completionPercentage
    : (totalUnfilled > 0 ? parseFloat(((auditedItems / totalUnfilled) * 100).toFixed(1)) : 0);

  return (
    <div className={styles.kpiGrid}>
      {error && (
        <div className={styles.errorBanner} role="alert">
          <strong>Notice:</strong> Unable to load live metrics. Displaying default values.
        </div>
      )}

      <article className={`${styles.card} ${styles.kpi}`}>
        <label>Total unfilled items</label>
        <strong>{totalUnfilled}</strong>
        <span>Live unfilled items monitored</span>
      </article>

      <article className={`${styles.card} ${styles.kpi}`}>
        <label>Audited Items</label>
        <strong>{auditedItems}</strong>
        <span>{`${completionPercentage}% audit completion`}</span>
      </article>

      <article className={`${styles.card} ${styles.kpi}`}>
        <label>Remaining Items to Audit</label>
        <strong>{remainingItems}</strong>
        <span>Requires priority review</span>
      </article>
    </div>
  );
}

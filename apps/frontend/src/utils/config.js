export const CONFIG = {
  // The Nginx location block for this deployment proxies /insighted-dpa/api/
  // to the backend's /api/ (prefix stripped) — so under that subpath the app
  // must call /insighted-dpa/api/..., not bare /api/..., or requests miss the
  // proxy location entirely. Matches the same detection public/js/config.js
  // already uses for the vanilla-JS build of this app.
  API_BASE: window.location.pathname.startsWith('/insighted-dpa') ? '/insighted-dpa/api' : '/api',
  CACHE_TTL: 300000, // 5 minutes
};

export const BADGE_CLASSES = {
  unfilled: 'bg-red-100 text-red-800 border border-red-200',
  filled: 'bg-green-100 text-green-800 border border-green-200',
  progress: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
};

export const columns = [
  "ITEM NUMBER",
  "POSITION TITLE",
  "POSITION CATEGORY",
  "ITEM_STATUS",
  "SG",
  "YEAR CREATED",
  "YEARS UNFILLED",
  "VACANCY AGING STATUS",
  "POSITION STATUS",
  "NAME OF INCUMBENT",
  "FIRST DAY OF SERVICE",
  "DATE OF VACANCY",
  "REASON FOR VACANCY",
  "STATUS OF VACANCY",
  "OTHER REMARKS",
  "TENTATIVE DATE TO FILL-UP"
];

export const numericColumns = new Set(["SG", "YEAR CREATED", "YEARS UNFILLED"]);
export const requiredInputColumns = ["POSITION STATUS", "REASON FOR VACANCY", "STATUS OF VACANCY", "TENTATIVE DATE TO FILL-UP"];

export const REASONS_FOR_VACANCY = [
  "Death",
  "Demotion",
  "Dropping from the Rolls",
  "End of Term",
  "Others",
  "Promotion",
  "Reclassification",
  "Resignation"
];

export const STATUSES_OF_VACANCY = [
  "Awaiting CSC Attestation",
  "CTI Item - Request for Abolition",
  "CTI Item - Request for Filling-Up",
  "Hard to Fill Position - Attorney Items",
  "Hard to Fill Position - Guidance Counselor items",
  "Hard to Fill Position - Lack of applicants with the appropriate specialization",
  "Hard to Fill Position - Lack of qualified applicants based on QS",
  "On-going Hiring Process - CAR/CAR-RQA Posting Period",
  "On-going Hiring Process - Comparative Assessment Stage",
  "On-going Hiring Process - Deliberation Stage",
  "On-going Hiring Process - Initial Evaluation Stage",
  "On-going Hiring Process - Publication Stage",
  "On-going Hiring Process - Selection & Appointment Stage",
  "Position is not consistent in the ECP",
  "Waiving of Items Under Special Hiring Arrangements - DOST scholar graduates",
  "Waiving of Items Under Special Hiring Arrangements - SPIMS beneficiaries"
];

// Statuses where the vacancy is not expected to be filled on a timeline, so
// "Tentative Date to Fill-Up" is locked to N/A instead of a user-picked date.
export const NA_TENTATIVE_DATE_STATUSES = [
  "CTI Item - Request for Abolition"
];

// Statuses where "Tentative Date to Fill-Up" stays user-editable but is not
// required — the record can still be saved as Draft with it left blank.
export const OPTIONAL_TENTATIVE_DATE_STATUSES = [
  "Position is not consistent in the ECP",
  "Hard to Fill Position - Guidance Counselor items"
];

export const editableSelects = {
  "POSITION STATUS": ["", "FILLED", "UNFILLED"],
  "REASON FOR VACANCY": ["", ...REASONS_FOR_VACANCY],
  "STATUS OF VACANCY": ["", ...STATUSES_OF_VACANCY]
};

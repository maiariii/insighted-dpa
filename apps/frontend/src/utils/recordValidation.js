/**
 * Checks if a personnel audit record (with any staged edits applied) has all
 * required fields accomplished. Returns an object detailing whether the record
 * is a valid "Draft" ready for saving, its effective position status, and list of missing fields.
 *
 * Required fields:
 * - FILLED position: position_status, name_of_incumbent, first_day_of_service
 * - UNFILLED position: position_status, date_of_vacancy, reason_for_vacancy, status_of_vacancy, tentative_date_to_fill_up
 */
export function checkRecordRequiredFields(record = {}, stagedEditsForRow = {}) {
  const getValue = (field, aliasKey) => {
    if (stagedEditsForRow[field] !== undefined) return stagedEditsForRow[field];
    if (record[field] !== undefined && record[field] !== null) return record[field];
    if (aliasKey && record[aliasKey] !== undefined && record[aliasKey] !== null) return record[aliasKey];
    return '';
  };

  const rawPosStatus = getValue('position_status', 'POSITION STATUS') || record.item_status || 'UNFILLED';
  const posStatus = String(rawPosStatus).toUpperCase() === 'FILLED' ? 'FILLED' : 'UNFILLED';
  const missingFields = [];

  if (posStatus === 'FILLED') {
    const incumbent = String(getValue('name_of_incumbent', 'NAME OF INCUMBENT')).trim();
    const firstDay = String(getValue('first_day_of_service', 'FIRST DAY OF SERVICE')).trim();

    if (!incumbent) missingFields.push('Name of Incumbent');
    if (!firstDay) missingFields.push('First Day of Service');
  } else {
    const dateVacancy = String(getValue('date_of_vacancy', 'DATE OF VACANCY')).trim();
    const reason = String(getValue('reason_for_vacancy', 'REASON FOR VACANCY')).trim();
    const status = String(getValue('status_of_vacancy', 'STATUS OF VACANCY')).trim();
    const tentative = String(getValue('tentative_date_to_fill_up', 'TENTATIVE DATE TO FILL-UP')).trim();

    if (!dateVacancy) missingFields.push('Date of Vacancy');
    if (!reason) missingFields.push('Reason for Vacancy');
    if (!status) missingFields.push('Status of Vacancy');
    if (!tentative) missingFields.push('Tentative Date to Fill-Up');
  }

  return {
    isDraft: missingFields.length === 0,
    posStatus,
    missingFields
  };
}

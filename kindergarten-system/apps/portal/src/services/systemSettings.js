export const SETTING_FIELDS = ['platform_name', 'organisation_name', 'support_email', 'support_phone', 'notice_enabled', 'notice_message']
export function settingsForm(row) {
  return Object.fromEntries(SETTING_FIELDS.map((key) => [key, row[key]]))
}
export function validateSettings(form) {
  if (!form.platform_name.trim() || form.platform_name.trim().length > 80) return 'Enter a platform name of up to 80 characters.'
  if (form.organisation_name.trim().length > 160) return 'Organisation name must be 160 characters or fewer.'
  if (form.support_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.support_email.trim())) return 'Enter a valid support email address.'
  if (form.support_phone.trim().length > 40) return 'Support phone must be 40 characters or fewer.'
  if (form.notice_message.trim().length > 500) return 'Platform notice must be 500 characters or fewer.'
  if (form.notice_enabled && !form.notice_message.trim()) return 'Enter a notice message before enabling it.'
  return ''
}

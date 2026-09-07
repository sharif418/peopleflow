// Portal → Settings module namespace — English (owned by Task 4-c agent)
export const enPortalSettings = {
  // ── Module header ──
  title: "Settings",
  subtitle: "Organization profile, workweek & payroll configuration",

  // ── Profile card ──
  profileTitle: "Profile",
  profileDesc: "Organization contact information — used on payslips and reports",
  orgNameLabel: "Organization name",
  lockedHint: "Read-only",
  subdomainLabel: "Subdomain",
  addressLabel: "Address",
  addressPlaceholder: "Holding, road, area, city…",
  phoneLabel: "Contact phone",
  phonePlaceholder: "+880 1XXX-XXXXXX",
  emailLabel: "Contact email",
  emailPlaceholder: "info@example.com",
  save: "Save",
  saving: "Saving…",
  savedToast: "Settings saved",
  saveFailed: "Save failed",
  errInvalidPhone: "Enter a valid phone number (e.g. +8801711…)",
  errInvalidEmail: "Enter a valid email address",
  unchangedHint: "The save button activates once something changes",

  // ── Workweek card ──
  workweekTitle: "Workweek",
  workweekDesc: "Pick which days of the week count as the weekend",
  workdayLabel: "Workday",
  weekendLabel: "Weekend",
  daySunday: "Sunday",
  dayMonday: "Monday",
  dayTuesday: "Tuesday",
  dayWednesday: "Wednesday",
  dayThursday: "Thursday",
  dayFriday: "Friday",
  daySaturday: "Saturday",
  workweekHint: "The attendance module uses this config to identify weekend days",
  workweekToast: "Workweek updated",

  // ── Payroll config card ──
  payrollTitle: "Payroll configuration",
  payrollDesc: "Provident fund & salary calculation rules",
  pfTitle: "Provident fund (PF)",
  pfDesc: "When enabled, both the employee and the employer deposit an equal share — a fixed percent of basic salary — every month",
  pfPercentLabel: "PF rate (percent of basic)",
  pfPercentUnit: "%",
  pfPercentHint: "Between 0 and 30%",
  pfNote: "This setting takes effect from the next payroll generation",
  payrollToast: "Payroll configuration updated",

  // ── Info card ──
  infoTitle: "Information",
  infoPlan: "Plan",
  infoEmployees: "Employees",
  infoSetup: "Setup",
  infoSetupDone: "Completed",
  infoSetupPending: "Pending",
  infoCreated: "Created",
  infoDomain: "Portal",

  // ── Misc ──
  loadFailed: "Failed to load settings",
}

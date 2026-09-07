// Setup wizard shared row types (departments/designations are plain strings).
export interface ShiftRow {
  name: string
  startTime: string
  endTime: string
}

export interface EmpRow {
  firstName: string
  lastName: string
  phone: string
  departmentName: string
}

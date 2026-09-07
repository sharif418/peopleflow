"use client"

// Admin UI transient state that must survive route changes (dialogs etc.)
import { create } from "zustand"

interface AdminUiState {
  /** organization whose detail dialog is open (dialog polls provisioning) */
  detailOrgId: string | null
  openOrg: (orgId: string) => void
  closeOrg: () => void
}

export const useAdminUiStore = create<AdminUiState>((set) => ({
  detailOrgId: null,
  openOrg: (orgId) => set({ detailOrgId: orgId }),
  closeOrg: () => set({ detailOrgId: null }),
}))

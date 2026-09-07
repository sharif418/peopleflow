"use client"

// Shared claim mutations (review state machine + delete) with optimistic
// status updates, rollback, toasts and query invalidation. Used by both tabs.
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import type { ClaimAction, ClaimDetail, ClaimRow, ClaimsData } from "./types"
import { expenseKeys } from "./types"
import { expenseErrorMessage } from "./utils"

const ACTION_STATUS: Record<ClaimAction, string> = {
  approve: "approved",
  reject: "rejected",
  mark_paid: "paid",
}

const TOAST_KEY: Record<ClaimAction, string> = {
  approve: "portal.expense.toasts.approved",
  reject: "portal.expense.toasts.rejected",
  mark_paid: "portal.expense.toasts.paid",
}

export function useClaimActions() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const reportError = (err: unknown) => {
    const mapped = expenseErrorMessage(err, t)
    toast.error(mapped ?? t("portal.expense.toasts.failed"))
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: expenseKeys.all })
  }

  // PATCH — approve / reject / mark_paid
  const reviewMutation = useMutation({
    mutationFn: (vars: { id: string; action: ClaimAction; note: string | null }) =>
      apiFetch<ClaimDetail>(`/api/org/expenses/claims/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: vars.action, note: vars.note }),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.all })
      const snapshots = queryClient.getQueriesData<ClaimsData>({
        queryKey: ["org", "expense", "claims"],
      })
      const target = ACTION_STATUS[vars.action]
      for (const [key, snapshot] of snapshots) {
        if (!snapshot) continue
        queryClient.setQueryData<ClaimsData>(key, {
          ...snapshot,
          items: snapshot.items.map((c: ClaimRow) =>
            c.id === vars.id ? { ...c, status: target as ClaimRow["status"] } : c,
          ),
        })
      }
      return { snapshots }
    },
    onError: (err: Error, _vars, ctx) => {
      reportError(err)
      if (ctx?.snapshots) {
        for (const [key, snapshot] of ctx.snapshots) queryClient.setQueryData(key, snapshot)
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(t(TOAST_KEY[vars.action]))
    },
    onSettled: invalidate,
  })

  // DELETE — only valid while submitted
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/org/expenses/claims/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.all })
      const snapshots = queryClient.getQueriesData<ClaimsData>({
        queryKey: ["org", "expense", "claims"],
      })
      for (const [key, snapshot] of snapshots) {
        if (!snapshot) continue
        queryClient.setQueryData<ClaimsData>(key, {
          ...snapshot,
          items: snapshot.items.filter((c: ClaimRow) => c.id !== id),
          total: Math.max(0, snapshot.total - 1),
        })
      }
      return { snapshots }
    },
    onError: (err: Error, _id, ctx) => {
      reportError(err)
      if (ctx?.snapshots) {
        for (const [key, snapshot] of ctx.snapshots) queryClient.setQueryData(key, snapshot)
      }
    },
    onSuccess: () => {
      toast.success(t("portal.expense.toasts.deleted"))
    },
    onSettled: invalidate,
  })

  const busyId = reviewMutation.isPending
    ? reviewMutation.variables?.id
    : deleteMutation.isPending
      ? (deleteMutation.variables ?? undefined)
      : undefined

  return { reviewMutation, deleteMutation, busyId }
}

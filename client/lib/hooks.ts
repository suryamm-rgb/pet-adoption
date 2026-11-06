"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { api, errorText } from "./api";

export function useGet<T>(path: string | null, key?: QueryKey, options: { refetchInterval?: number } = {}) {
  return useQuery({ queryKey: key ?? [path], queryFn: () => api<T>(path as string), enabled: path !== null, ...options });
}

/** Mutation with toast feedback and cache invalidation. */
export function useAction<TIn = void, TOut = unknown>(
  fn: (input: TIn) => Promise<TOut>,
  { invalidate = [], success, onSuccess }: { invalidate?: QueryKey[]; success?: string; onSuccess?: (out: TOut) => void } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (out) => {
      await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (success) toast("success", success);
      onSuccess?.(out);
    },
    onError: (e) => toast("error", errorText(e)),
  });
}

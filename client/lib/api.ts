export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";
const ORIGIN = API_URL.replace(/\/api$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData };

export async function api<T = unknown>(path: string, { method = "GET", body, form }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check that the API is running.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong", data.details);
  return data as T;
}

/** Uploaded files come back as /uploads/x.jpg (local) or a full Cloudinary URL. */
export const fileUrl = (path?: string) => (!path ? "" : path.startsWith("http") ? path : ORIGIN + path);

export const errorText = (e: unknown) =>
  e instanceof ApiError ? (e.details?.length ? `${e.message}: ${e.details.map((d) => d.message).join(", ")}` : e.message) : "Something went wrong";

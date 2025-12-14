export type User = {
  id: string;
  email: string;
  role: string;
};

export type Sweet = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

type ApiError = {
  message?: string;
  issues?: unknown;
};

const API_BASE = "/api";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function requestJson<T>(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
  } = {},
): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value == null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body == null ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new Error(
      "Failed to reach the API. Make sure `npm run dev` is running, open the app at http://localhost:5173/, and confirm the backend health check at http://localhost:3001/health.",
    );
  }

  if (!res.ok) {
    let errBody: ApiError | null = null;
    try {
      errBody = await parseJson<ApiError>(res);
    } catch {
      // ignore
    }
    const message = errBody?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return parseJson<T>(res);
}

export const api = {
  register(email: string, password: string) {
    return requestJson<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: { email, password },
    });
  },

  login(email: string, password: string) {
    return requestJson<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  listSweets(token: string) {
    return requestJson<Sweet[]>("/sweets", { token });
  },

  searchSweets(
    token: string,
    query: { name?: string; category?: string; minPrice?: number; maxPrice?: number },
  ) {
    return requestJson<Sweet[]>("/sweets/search", { token, query });
  },

  createSweet(
    token: string,
    input: { name: string; category: string; price: number; quantity: number },
  ) {
    return requestJson<Sweet>("/sweets", { method: "POST", token, body: input });
  },

  updateSweet(
    token: string,
    sweetId: string,
    input: Partial<{ name: string; category: string; price: number; quantity: number }>,
  ) {
    return requestJson<Sweet>(`/sweets/${sweetId}`, { method: "PUT", token, body: input });
  },

  purchaseSweet(token: string, sweetId: string, amount = 1) {
    return requestJson<Sweet>(`/sweets/${sweetId}/purchase`, {
      method: "POST",
      token,
      body: { amount },
    });
  },

  restockSweet(token: string, sweetId: string, amount = 1) {
    return requestJson<Sweet>(`/sweets/${sweetId}/restock`, {
      method: "POST",
      token,
      body: { amount },
    });
  },

  deleteSweet(token: string, sweetId: string) {
    return requestJson<void>(`/sweets/${sweetId}`, { method: "DELETE", token });
  },
};

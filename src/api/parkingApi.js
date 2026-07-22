const roleHeaders = {
  user: "Service Advisor",
  valet: "Valet",
  admin: "Admin"
};

export async function apiRequest(role, path, options = {}) {
  const headers = new Headers(options.headers || {});
  
  const token = localStorage.getItem("token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/${role}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const body = text ? parseBody(text) : null;

  if (!response.ok) {
    const message = body?.error || body?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return {
    status: response.status,
    body
  };
}

function parseBody(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

async function parseResponse(response) {
  const text = await response.text();
  return text ? parseBody(text) : null;
}

export const parkingApi = {
  // --- Authentication ---
  login: async (username, password) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      throw new Error((data && data.error) || "Login failed");
    }
    return data;
  },
  
  // --- Visit Operations ---
  createVisit: (role, payload) =>
    apiRequest(role, "/visits/check-in", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  checkIn: (role, payload) =>
    apiRequest(role, "/visits/check-in", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  getVisit: (role, id) => apiRequest(role, `/visits/${id}`),

  loadVisits: () => apiRequest("admin", "/visits"),

  // --- Vehicle Workflow ---
  requestVehicle: (role, id) =>
    apiRequest(role, `/visits/${id}/request-vehicle`, { method: "POST" }),

  requestCheckout: (role, id) =>
    apiRequest(role, `/visits/${id}/request-checkout`, { method: "POST" }),

  acknowledge: (role, id) =>
    apiRequest(role, `/visits/${id}/acknowledge`, { method: "POST" }),

  markReady: (role, id) =>
    apiRequest(role, `/visits/${id}/ready`, { method: "POST" }),

  // --- Add-on Services ---
  addOn: (role, id, service) =>
    apiRequest(role, `/visits/${id}/add-ons`, {
      method: "POST",
      body: JSON.stringify({ service })
    }),

  getAddOns: (role, id) => apiRequest(role, `/visits/${id}/add-ons`),

  startAddOn: (role, id, service) =>
    apiRequest(role, `/visits/${id}/add-ons/start`, {
      method: "POST",
      body: JSON.stringify({ service })
    }),

  completeAddOn: (role, id, service) =>
    apiRequest(role, `/visits/${id}/add-ons/complete`, {
      method: "POST",
      body: JSON.stringify({ service })
    }),

  // --- Checkout ---
  acceptCheckout: (role, id) =>
    apiRequest(role, `/visits/${id}/accept-checkout`, { method: "POST" }),

  // --- User Management ---
  signup: async (username, email, password) => {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error((data && data.error) || "Signup failed");
    return data;
  },

  getPendingUsers: () => apiRequest("admin", "/users/pending"),

  assignRole: (id, role) =>
    apiRequest("admin", `/users/${id}/role`, {
      method: "POST",
      body: JSON.stringify({ role })
    }),

  // --- Billing & Payment Mock ---
  getBill: async (id) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/visits/${id}/bill`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error((data && data.error) || "Failed to fetch bill");
    return data;
  },

  mockPaymentWebhook: async (visitId) => {
    const res = await fetch("/api/webhook/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitId })
    });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error((data && data.error) || "Payment webhook failed");
    return data;
  },

  setSurgeMultiplier: (multiplier) =>
    apiRequest("admin", "/surge", {
      method: "POST",
      body: JSON.stringify({ multiplier })
    })
};

const roleHeaders = {
  user: "Service Advisor",
  valet: "Valet",
  admin: "Admin"
};

export async function apiRequest(role, path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("X-User-Role", roleHeaders[role]);

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

export const parkingApi = {
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
  requestVehicle: (role, id) =>
    apiRequest(role, `/visits/${id}/request-vehicle`, { method: "POST" }),
  requestCheckout: (role, id) =>
    apiRequest(role, `/visits/${id}/request-checkout`, { method: "POST" }),
  acknowledge: (role, id) =>
    apiRequest(role, `/visits/${id}/acknowledge`, { method: "POST" }),
  markReady: (role, id) =>
    apiRequest(role, `/visits/${id}/ready`, { method: "POST" }),
  addOn: (role, id, service) =>
    apiRequest(role, `/visits/${id}/add-ons`, {
      method: "POST",
      body: JSON.stringify({ service })
    }),
  checkOut: (role, id) =>
    apiRequest(role, `/visits/${id}/check-out`, { method: "POST" })
};

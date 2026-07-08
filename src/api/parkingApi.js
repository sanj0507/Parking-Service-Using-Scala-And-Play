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

export const parkingApi = {
  /**
   * Authenticate a user and receive a JWT token.
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<Object>} Contains the JWT token and user data on success.
   */
  login: async (username, password) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    return data;
  },
  
  /**
   * Create a new visit (check-in a vehicle).
   * @param {string} role The role of the user making the request (e.g., 'admin', 'valet', 'advisor')
   * @param {Object} payload Vehicle and customer details
   */
  createVisit: (role, payload) =>
    apiRequest(role, "/visits/check-in", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  /**
   * Alias for createVisit (check-in a vehicle).
   * @param {string} role 
   * @param {Object} payload 
   */
  checkIn: (role, payload) =>
    apiRequest(role, "/visits/check-in", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  /**
   * Get details of a specific visit by ID.
   * @param {string} role 
   * @param {string|number} id Visit ID
   */
  getVisit: (role, id) => apiRequest(role, `/visits/${id}`),

  /**
   * Load all visits (typically for admin view).
   */
  loadVisits: () => apiRequest("admin", "/visits"),

  /**
   * Customer or advisor requests their vehicle to be retrieved.
   * @param {string} role 
   * @param {string|number} id Visit ID
   */
  requestVehicle: (role, id) =>
    apiRequest(role, `/visits/${id}/request-vehicle`, { method: "POST" }),

  /**
   * Request checkout for a visit to prepare final billing.
   * @param {string} role 
   * @param {string|number} id Visit ID
   */
  requestCheckout: (role, id) =>
    apiRequest(role, `/visits/${id}/request-checkout`, { method: "POST" }),

  /**
   * Valet acknowledges the vehicle retrieval request.
   * @param {string} role 
   * @param {string|number} id Visit ID
   */
  acknowledge: (role, id) =>
    apiRequest(role, `/visits/${id}/acknowledge`, { method: "POST" }),

  /**
   * Valet marks the vehicle as ready for the customer.
   * @param {string} role 
   * @param {string|number} id Visit ID
   */
  markReady: (role, id) =>
    apiRequest(role, `/visits/${id}/ready`, { method: "POST" }),

  /**
   * Add a new service (add-on) to a visit (e.g., wash, detailing).
   * @param {string} role 
   * @param {string|number} id Visit ID
   * @param {string} service Name of the service
   */
  addOn: (role, id, service) =>
    apiRequest(role, `/visits/${id}/add-ons`, {
      method: "POST",
      body: JSON.stringify({ service })
    }),

  /**
   * Get all add-on services for a specific visit.
   * @param {string} role 
   * @param {string|number} id Visit ID
   */
  getAddOns: (role, id) => apiRequest(role, `/visits/${id}/add-ons`),

  /**
   * Start working on a specific add-on service.
   * @param {string} role 
   * @param {string|number} id Visit ID
   * @param {string} service Name of the service
   */
  startAddOn: (role, id, service) =>
    apiRequest(role, `/visits/${id}/add-ons/start`, {
      method: "POST",
      body: JSON.stringify({ service })
    }),

  /**
   * Mark a specific add-on service as completed.
   * @param {string} role 
   * @param {string|number} id Visit ID
   * @param {string} service Name of the service
   */
  completeAddOn: (role, id, service) =>
    apiRequest(role, `/visits/${id}/add-ons/complete`, {
      method: "POST",
      body: JSON.stringify({ service })
    }),

  /**
   * Finalize checkout for a visit and complete the process.
   * @param {string} role 
   * @param {string|number} id Visit ID
   */
  checkOut: (role, id) =>
    apiRequest(role, `/visits/${id}/check-out`, { method: "POST" }),

  /**
   * Sign up a new user
   */
  signup: async (username, email, password) => {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    return data;
  },

  /**
   * Admin: Get all pending users
   */
  getPendingUsers: () => apiRequest("admin", "/users/pending"),

  /**
   * Admin: Assign role to user
   */
  assignRole: (id, role) =>
    apiRequest("admin", `/users/${id}/role`, {
      method: "POST",
      body: JSON.stringify({ role })
    })
};

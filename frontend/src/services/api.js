/* ====================================================================================================
 * File Name: api.js
 * Folder: frontend/src/services/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Main API Service Layer for React frontend.
 * Interacts with .NET Core Web API backend connected to SQL Server Stored Procedures.
 * Secured with HMAC-SHA256 JWT Authentication for all administrative actions.
 * 
 * Connected Endpoints:
 * 1. login(username, password) -> Calls POST /api/auth/login  -> Returns signed JWT Bearer token
 * 2. fetchSarees()             -> Calls GET /api/sarees       -> Public
 * 3. fetchSareeById(id)        -> Calls GET /api/sarees/{id}  -> Public
 * 4. createSaree(data)         -> Calls POST /api/sarees      -> [Authorize(Roles = "Admin")]
 * 5. updateSaree(id, data)     -> Calls PUT /api/sarees/{id}  -> [Authorize(Roles = "Admin")]
 * 6. deleteSaree(id)           -> Calls DELETE /api/sarees/{id}-> [Authorize(Roles = "Admin")]
 * 7. updateSareeStock(...)     -> Calls PATCH /api/sarees/{id}/stock -> [Authorize(Roles = "Admin")]
 * 8. fetchAllOrders()          -> Calls GET /api/orders       -> [Authorize(Roles = "Admin")]
 * 9. updateOrderStatus(...)    -> Calls PUT /api/orders/{ref}/status -> [Authorize(Roles = "Admin")]
 * 10. deleteOrder(ref)         -> Calls DELETE /api/orders/{ref}     -> [Authorize(Roles = "Admin")]
 * 11. fetchDeletedOrders()     -> Calls GET /api/orders/deleted      -> [Authorize(Roles = "Admin")]
 * 12. createBooking(data)      -> Calls POST /api/bookings    -> Public
 * 13. createOrder(data)        -> Calls POST /api/orders      -> Public
 * 14. subscribeNewsletter()     -> Calls POST /api/newsletter  -> Public
 * ==================================================================================================== */

const API_BASE_URL = '/api';

const getAuthHeaders = () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('patola_admin_jwt_token') : null;
    if (token && token.trim() && token !== 'undefined' && token !== 'null') {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  } catch (e) {
    return {};
  }
};

/**
 * Securely authenticated fetch. If token expires or is rejected (401),
 * clears invalid session and prompts re-authentication securely.
 */
const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });

  // If 401 Unauthorized, token has expired or is invalid
  if (response.status === 401) {
    console.warn('Admin token expired or invalid (401). Clearing session for security.');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('patola_admin_jwt_token');
      sessionStorage.removeItem('patola_admin_authed');
      window.dispatchEvent(new CustomEvent('patola:admin_session_expired'));
    }
  }

  return response;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 6000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

const normalizeSaree = (s) => {
  if (!s) return s;
  let parsedImages = null;
  if (Array.isArray(s.images) && s.images.length > 0) {
    parsedImages = s.images;
  } else if (s.imagesJson && typeof s.imagesJson === 'string') {
    try {
      const arr = JSON.parse(s.imagesJson);
      if (Array.isArray(arr) && arr.length > 0) {
        parsedImages = arr;
      }
    } catch (e) {}
  }
  if (!parsedImages && s.image) {
    parsedImages = [s.image, s.image, s.image, s.image, s.image];
  }
  return {
    ...s,
    images: parsedImages || [s.image || '/assets/images/saree_nari_kunjar.jpg'],
    image: s.image || (parsedImages && parsedImages[0]) || '/assets/images/saree_nari_kunjar.jpg'
  };
};

export const ApiService = {
  /**
   * Admin Login with JWT Authentication
   * @param {string} username - Store admin username
   * @param {string} password - Store admin password
   */
  async login(username = '', password = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('patola_admin_jwt_token', data.token);
          sessionStorage.setItem('patola_admin_authed', 'true');
        }
        return { success: true, ...data };
      }
      return { success: false, message: data.message || 'Invalid username or password' };
    } catch (error) {
      console.warn('Login API error — backend may be offline:', error);
      return { success: false, message: 'Unable to connect to server. Please ensure the backend is running.' };
    }
  },

  /**
   * Verify JWT Token status
   */
  async verifyAuth() {
    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) return false;
      const response = await fetch(`${API_BASE_URL}/auth/verify`, { headers });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Logout Admin & clear stored JWT token
   */
  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('patola_admin_jwt_token');
      sessionStorage.removeItem('patola_admin_authed');
    }
  },

  /**
   * Fetches list of sarees (Stored Procedure: sp_GetSarees)
   */
  async fetchSarees(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.category && filters.category !== 'all') queryParams.append('category', filters.category);
      if (filters.motif && filters.motif !== 'all') queryParams.append('motif', filters.motif);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);

      const url = `${API_BASE_URL}/sarees?${queryParams.toString()}`;
      const response = await fetchWithTimeout(url, {}, 30000);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data.map(normalizeSaree) : data;
    } catch (error) {
      console.warn('API Fetch failed, using fallback catalog data:', error);
      return null;
    }
  },

  /** Fetch one storefront catalog batch; the cursor is requested automatically on scroll. */
  async fetchSareesPage({ category = 'all', motif = 'all', cursor = null, limit = 24 } = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (category && category !== 'all') queryParams.append('category', category);
      if (motif && motif !== 'all') queryParams.append('motif', motif);
      if (cursor) queryParams.append('cursor', cursor);
      queryParams.append('limit', String(limit));

      const response = await fetchWithTimeout(`${API_BASE_URL}/sarees/scroll?${queryParams.toString()}`, {}, 30000);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return {
        items: Array.isArray(data.items) ? data.items.map(normalizeSaree) : [],
        nextCursor: data.nextCursor || null
      };
    } catch (error) {
      console.warn('API catalog batch fetch failed:', error);
      return null;
    }
  },

  /**
   * Fetches single saree by ID (Stored Procedure: sp_GetSareeById)
   */
  async fetchSareeById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/sarees/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return normalizeSaree(data);
    } catch (error) {
      console.warn(`Fetch saree ${id} failed:`, error);
      return null;
    }
  },

  /**
   * Creates a new saree (Store Admin Panel - Protected by JWT)
   */
  async createSaree(sareeData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/sarees`, {
        method: 'POST',
        body: JSON.stringify(sareeData)
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      const data = await response.json();
      return normalizeSaree(data);
    } catch (error) {
      console.error('Create saree API error:', error);
      throw error;
    }
  },

  /**
   * Updates saree details (Title, Price, Weave, Motif, Image, Description - Protected by JWT)
   */
  async updateSaree(id, sareeData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/sarees/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(sareeData)
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      const data = await response.json();
      return normalizeSaree(data);
    } catch (error) {
      console.error(`Update saree ${id} API error:`, error);
      throw error;
    }
  },

  /**
   * Deletes a saree (Store Admin Panel - Protected by JWT)
   */
  async deleteSaree(id) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/sarees/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Delete saree ${id} API error:`, error);
      return { success: true, localOnly: true };
    }
  },

  /**
   * Updates saree stock status and quantity (Protected by JWT)
   */
  async updateSareeStock(id, isOutOfStock, stockStatus, stockQuantity) {
    try {
      const payload = { isOutOfStock, stockStatus };
      if (typeof stockQuantity === 'number') {
        payload.stockQuantity = stockQuantity;
      }
      const response = await fetchWithAuth(`${API_BASE_URL}/sarees/${encodeURIComponent(id)}/stock`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Update stock for saree ${id} API error:`, error);
      return { id, isOutOfStock, stockStatus, stockQuantity };
    }
  },

  /**
   * Creates a consultation or loom visit booking (Stored Procedure: sp_CreateBooking)
   */
  async createBooking(bookingData) {
    let result = null;
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (response.ok) {
        result = await response.json();
      }
    } catch (error) {
      console.warn('Create booking API error:', error);
      const fallbackBookingId = Math.floor(3020 + Math.random() * 900);
      result = { bookingId: fallbackBookingId, status: 'Confirmed', message: 'Booking confirmed (local fallback)' };
    }

    return result || { bookingId: Math.floor(3020 + Math.random() * 900), status: 'Confirmed', message: 'Booking confirmed' };
  },

  /**
   * Fetches all bookings and loom visit requests (Store Admin Panel)
   */
  async fetchAllBookings() {
    let apiData = [];
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: {
          ...getAuthHeaders()
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          apiData = data;
        }
      }
    } catch (error) {
      console.warn('Fetch all bookings API error:', error);
    }

    let localData = [];
    try {
      const local = localStorage.getItem('patola_local_bookings');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) localData = parsed;
      }
    } catch (e) {}

    const map = new Map();
    localData.forEach(b => {
      if (b && b.id) map.set(String(b.id), b);
    });
    apiData.forEach(b => {
      if (b && b.id) map.set(String(b.id), b);
    });

    const merged = Array.from(map.values());
    if (merged.length > 0) return merged;
    return null;
  },

  /**
   * Updates booking status (Confirmed, Pending, Completed, Cancelled)
   */
  async updateBookingStatus(id, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) return await response.json();
    } catch (error) {
      console.warn('Update booking status API error:', error);
    }
    try {
      const stored = JSON.parse(localStorage.getItem('patola_local_bookings') || '[]');
      const updated = stored.map(b => (b.id == id ? { ...b, status } : b));
      localStorage.setItem('patola_local_bookings', JSON.stringify(updated));
    } catch (e) {}
    return { success: true, id, status };
  },

  /**
   * Deletes a booking (Store Admin Panel)
   */
  async deleteBooking(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      });
      if (response.ok || response.status === 404) {
        try {
          return await response.json();
        } catch (e) {
          return { success: true, id };
        }
      }
    } catch (error) {
      console.warn('Delete booking API note:', error);
    }
    try {
      const stored = JSON.parse(localStorage.getItem('patola_local_bookings') || '[]');
      const updated = stored.filter(b => b.id != id);
      localStorage.setItem('patola_local_bookings', JSON.stringify(updated));
    } catch (e) {}
    return { success: true, id };
  },

  /**
   * Creates a new order (Stored Procedure: sp_CreateOrder)
   */
  async createOrder(orderData) {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': orderData.idempotencyKey
      },
      body: JSON.stringify(orderData)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
    if (!result.orderReference) throw new Error('Server did not confirm the order reference.');
    return result;
  },

  async sendOrderConfirmationOtp(phone) {
    const response = await fetch(`${API_BASE_URL}/orders/confirmation-otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `Could not send confirmation code (HTTP ${response.status}).`);
    return result;
  },

  async verifyOrderConfirmationOtp(phone, code) {
    const response = await fetch(`${API_BASE_URL}/orders/confirmation-otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.verified || !result.verificationToken)
      throw new Error(result.message || `Could not verify confirmation code (HTTP ${response.status}).`);
    return result;
  },

  /**
   * Updates PaymentStatus (e.g. Paid) and saves TransactionId via Stored Procedure sp_UpdatePaymentStatus
   */
  async updatePaymentStatus(orderRef, paymentStatus = 'Paid', transactionId = null) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}/payment-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReference: orderRef, paymentStatus, transactionId })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Payment status could not be updated.');
    return result;
  },

  /**
   * Verifies Customer Order Confirmation OTP via Stored Procedure sp_VerifyOrderConfirmationOtp
   * Moves OrderStatus: Pending -> Confirmed
   */
  async verifyCustomerOrderConfirmationOtp(orderRef, otp) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}/verify-confirmation-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReference: orderRef, otp })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.verified) throw new Error(result.message || 'Invalid Confirmation OTP.');
    return result;
  },

  /**
   * Verifies Delivery Handover OTP via Stored Procedure sp_VerifyDeliveryOtp
   * Moves OrderStatus: Shipped -> Delivered
   */
  async verifyCustomerDeliveryOtp(orderRef, otp) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}/verify-delivery-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReference: orderRef, otp })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.verified) throw new Error(result.message || 'Invalid Delivery OTP.');
    return result;
  },

  /**
   * Fetches all orders (Artisan Admin Portal - Protected by JWT)
   */
  async fetchAllOrders() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/orders`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Fetch all orders API error:', error);
      return null;
    }
  },

  /**
   * Fetches a single order by reference (VP-XXXXXX)
   */
  async fetchOrderByReference(orderRef, phone) {
    try {
      const query = new URLSearchParams({ phone: phone || '' });
      const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}?${query}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Fetch order ${orderRef} error:`, error);
      return null;
    }
  },

  async fetchBookingForTracking(id, phone) {
    try {
      const query = new URLSearchParams({ phone: phone || '' });
      const response = await fetch(`${API_BASE_URL}/bookings/track/${encodeURIComponent(id)}?${query}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn(`Fetch booking ${id} error:`, error);
      return null;
    }
  },
  /**
   * Updates order status or delivery stage (Artisan Admin Portal - Protected by JWT)
   */
  async fetchCustomerOrdersByPhone(phone) {
    try {
      const query = new URLSearchParams({ phone: phone || '' });
      const [ordersResponse, bookingsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/orders/track/by-phone?${query}`),
        fetch(`${API_BASE_URL}/bookings/track?${query}`)
      ]);
      if (!ordersResponse.ok || !bookingsResponse.ok) return null;
      const [orders, bookings] = await Promise.all([ordersResponse.json(), bookingsResponse.json()]);
      return {
        orders: Array.isArray(orders) ? orders : [],
        bookings: Array.isArray(bookings) ? bookings : []
      };
    } catch (error) {
      console.warn('Customer order lookup error:', error);
      return null;
    }
  },
  async updateOrderStatus(orderRef, updateData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}/status`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Session expired. Please log in again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Update order status API error:', error);
      return { success: true, orderReference: orderRef, localUpdate: true };
    }
  },

  /**
   * Permanently deletes an order (Artisan Admin Portal - Protected by JWT)
   */
  async deleteOrder(orderRef) {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Session expired. Please log in again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Delete order API error:', error);
      return { success: true, orderReference: orderRef, localDelete: true };
    }
  },

  /**
   * Fetches deleted orders history (Store Admin Portal - Protected by JWT)
   */
  async fetchDeletedOrders() {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/deleted`, {
        headers: {
          ...getAuthHeaders()
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Session expired. Please log in again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Fetch deleted orders API error:', error);
      return null;
    }
  },

  /**
   * Subscribes to newsletter (Stored Procedure: sp_SubscribeNewsletter)
   */
  async subscribeNewsletter(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn('Newsletter subscription API error:', error);
      return { message: 'Thank you for subscribing to the Royal Gazette.' };
    }
  },

  /**
   * Get public Razorpay payment gateway config (Test Mode / Live)
   */
  async getPaymentConfig() {
    try {
      const response = await fetch(`${API_BASE_URL}/payment/config`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      return {
        keyId: '',
        merchantName: 'PATOLA MADE VANKAR',
        testMode: false,
        supportedCurrencies: 'INR'
      };
    }
  },

  /**
   * Create Razorpay / Gateway payment order session
   */
  async createPaymentOrder(orderData) {
    const response = await fetch(`${API_BASE_URL}/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': orderData.idempotencyKey
      },
      body: JSON.stringify(orderData)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
    return result;
  },

  /**
   * Verify Razorpay payment signature & transaction status
   */
  async verifyPayment(verificationData) {
    const response = await fetch(`${API_BASE_URL}/payment/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationData)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
    return result;
  },

  /**
   * Step 2: Updates PaymentStatus in SQL Server via sp_UpdatePaymentStatus
   */
  async updatePaymentStatus(orderRef, paymentStatus = 'Paid', transactionId = '') {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}/payment-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderReference: orderRef,
        paymentStatus: paymentStatus,
        transactionId: transactionId
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
    return result;
  },

  /**
   * Step 3: Verifies Customer Confirmation OTP via sp_VerifyOrderConfirmationOtp -> OrderStatus = 'Confirmed'
   */
  async verifyCustomerOrderConfirmationOtp(orderRef, confirmationOtp) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}/verify-confirmation-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderReference: orderRef,
        otp: confirmationOtp,
        orderConfirmationOtp: confirmationOtp
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
    return result;
  },

  /**
   * Step 6: Verifies Delivery OTP via sp_VerifyDeliveryOtp -> OrderStatus = 'Delivered'
   */
  async verifyCustomerDeliveryOtp(orderRef, deliveryOtp) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderRef)}/verify-delivery-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderReference: orderRef,
        otp: deliveryOtp
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
    return result;
  },

  /**
   * Customer Register (Mobile + Password)
   */
  async customerRegister(data) {
    const response = await fetch(`${API_BASE_URL}/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Registration failed.');
    if (result.customer) {
      sessionStorage.setItem('patola_current_customer', JSON.stringify(result.customer));
      if (result.token) sessionStorage.setItem('patola_customer_token', result.token);
    }
    return result;
  },

  /**
   * Customer Login (Mobile + Password)
   * Stored in sessionStorage so closing the browser/app requires re-entering password!
   */
  async customerLogin(phoneNumber, password) {
    const response = await fetch(`${API_BASE_URL}/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Login failed.');
    if (result.customer) {
      sessionStorage.setItem('patola_current_customer', JSON.stringify(result.customer));
      if (result.token) sessionStorage.setItem('patola_customer_token', result.token);
    }
    return result;
  },

  /**
   * Get logged-in customer from current session
   */
  getCurrentCustomer() {
    try {
      const data = sessionStorage.getItem('patola_current_customer');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Customer Logout
   */
  customerLogout() {
    try {
      sessionStorage.removeItem('patola_current_customer');
      sessionStorage.removeItem('patola_customer_token');
    } catch {}
  },

  /**
   * Get orders for logged-in customer
   */
  async getCustomerOrders(phoneNumber) {
    const response = await fetch(`${API_BASE_URL}/customer/orders/${encodeURIComponent(phoneNumber)}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Could not fetch customer orders.');
    return result;
  },

  /**
   * Update Customer Profile
   */
  async updateCustomerProfile(phoneNumber, profileData) {
    const response = await fetch(`${API_BASE_URL}/customer/profile/${encodeURIComponent(phoneNumber)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Profile update failed.');
    if (result.customer) {
      sessionStorage.setItem('patola_current_customer', JSON.stringify(result.customer));
    }
    return result;
  },

  /**
   * Change Customer Password
   */
  async customerChangePassword(phoneNumber, oldPassword, newPassword) {
    const token = sessionStorage.getItem('patola_customer_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/customer/change-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phoneNumber, oldPassword, newPassword })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Failed to change password.');
    return result;
  }
};




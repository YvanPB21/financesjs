/**
 * API Configuration Layer
 * Replaces direct Firebase SDK connection with backend API calls.
 */

const API_BASE = '/api';

const api = {
    async request(method, url, options = {}) {
        let loaderTimeout = setTimeout(() => toggleLoading(true), 400);
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            return await response.json();
        } finally {
            clearTimeout(loaderTimeout);
            toggleLoading(false);
        }
    },

    async get(endpoint, params = {}) {
        const url = new URL(`${window.location.origin}${API_BASE}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        return this.request('GET', url);
    },

    async post(endpoint, data) {
        return this.request('POST', `${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, id, data) {
        return this.request('PUT', `${API_BASE}${endpoint}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint, id) {
        return this.request('DELETE', `${API_BASE}${endpoint}/${id}`, {
            method: 'DELETE'
        });
    }
};

// Mock the global 'firebase' object for compatibility if needed elsewhere
window.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => null // Handled by server
        }
    }
};

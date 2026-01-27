// API Configuration for PlayRight
// These values can be overridden via environment variables at build time

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// Helper to construct API URLs
export const apiUrl = (path) => `${API_BASE}${path}`;

// Helper to construct WebSocket URLs
export const wsUrl = (path = '') => `${WS_BASE}${path}`;

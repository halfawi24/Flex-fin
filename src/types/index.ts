/**
 * Global type definitions
 * Add your shared types here
 */

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Add more shared types as needed

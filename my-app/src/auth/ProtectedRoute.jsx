import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const isTokenExpired = (token) => {
    if (!token) {
        return true;
    }
    try {
        // The token is in three parts: header.payload.signature
        // We need to decode the payload to check the expiration time.
        const payload = JSON.parse(atob(token.split('.')[1]));

        // 'exp' is the expiration time in seconds since the epoch.
        // We compare it with the current time.
        if (payload.exp * 1000 < Date.now()) {
            return true; // Token is expired
        }
        return false; // Token is not expired
    } catch (error) {
        console.error('Error decoding token:', error);
        return true; // If we can't decode it, treat it as expired/invalid
    }
};

const ProtectedRoute = () => {
    // Check if the authentication token exists in local storage
    const token = localStorage.getItem('token');
    const tokenIsExpired = isTokenExpired(token);

    // If the token exists, render the child route using <Outlet />.
    // Otherwise, redirect the user to the login page.
    return !tokenIsExpired ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
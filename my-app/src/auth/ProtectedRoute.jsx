import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    // Check if the authentication token exists in local storage
    const token = localStorage.getItem('token');

    // If the token exists, render the child route using <Outlet />.
    // Otherwise, redirect the user to the login page.
    return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
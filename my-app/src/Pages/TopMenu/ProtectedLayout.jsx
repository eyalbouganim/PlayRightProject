import React from 'react';
import { Outlet } from 'react-router-dom';
import TopAppBar from '../Pages/TopMenu/TopAppBar';
import { Box } from '@mui/material';

const ProtectedLayout = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <TopAppBar />
            {/* The Outlet will render the matched child route component (e.g., Home or Recording) */}
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default ProtectedLayout;

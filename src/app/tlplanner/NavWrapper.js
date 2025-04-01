'use client';

import { useTLName } from '../../hooks/useTLName';
import Nav from '../../ui/nav';
import { Suspense } from 'react';

export default function NavWrapper() {
    const { tlname, isLoading } = useTLName();
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Nav tlname={tlname} />
        </Suspense>
    );
} 
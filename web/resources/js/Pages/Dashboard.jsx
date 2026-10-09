import React from 'react';
import ScenarioDashboard from '@/Components/ScenarioLab/ScenarioDashboard';
import { Head } from '@inertiajs/react';

export default function Dashboard({ auth, ...props }) {
    return (
        <>
            <Head title="Scenario Lab & Intelligence — Survive" />
            <ScenarioDashboard user={auth?.user} initialPage="dashboard" {...props} />
        </>
    );
}

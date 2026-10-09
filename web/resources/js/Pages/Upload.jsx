import React from 'react';
import ScenarioDashboard from '@/Components/ScenarioLab/ScenarioDashboard';
import { Head } from '@inertiajs/react';

export default function Upload({ auth }) {
    return (
        <>
            <Head title="Upload File & Data Ingestion — Northstar" />
            <ScenarioDashboard user={auth?.user} initialPage="upload" />
        </>
    );
}

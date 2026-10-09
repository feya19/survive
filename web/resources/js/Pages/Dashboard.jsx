import ScenarioDashboard from '@/Components/ScenarioLab/ScenarioDashboard';
import { Head } from '@inertiajs/react';

export default function Dashboard({ auth }) {
    return (
        <>
            <Head title="Scenario Lab — Comparison Dashboard" />
            <ScenarioDashboard user={auth?.user} />
        </>
    );
}


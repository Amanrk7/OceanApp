export default function StatCard({ label, value, icon: Icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        green: 'bg-green-50 border-green-200 text-green-600',
        red: 'bg-red-50 border-red-200 text-red-600',
    };

    return (
        <div className={`rounded-xl border-2 `}
            style={{
                background: `var(--color-cards-background)`,

            }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-75">{label}</h3>
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}
export default function AddExpenseModal({ onClose, onAdd }) {
    const [formData, setFormData] = useState({
        category: 'Other',
        amount: '',
        game: '',
        notes: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.amount && formData.game) {
            onAdd({
                date: new Date().toLocaleDateString(),
                details: `Point Reload (${formData.game})`,
                amount: parseFloat(formData.amount),
                points: '+10000',
                category: formData.category,
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-orange-50 border-b border-orange-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Record New Expense
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Track business costs and game point reloads.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Category
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) =>
                                setFormData({ ...formData, category: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        >
                            <option>Point Reload</option>
                            <option>Service Fee</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Amount ($)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) =>
                                setFormData({ ...formData, amount: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Game
                        </label>
                        <select
                            value={formData.game}
                            onChange={(e) =>
                                setFormData({ ...formData, game: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        >
                            <option value="">Select a game</option>
                            <option>Billion balls</option>
                            <option>Cash frenzy</option>
                            <option>Game Vault</option>
                            <option>Juwa</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                            rows="3"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-900 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Record Expense
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
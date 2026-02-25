import { useState } from "react";
import { CheckCircle, Plus } from "lucide-react";

export default function AddWalletModal({ onClose }) {
    const [formData, setFormData] = useState({
        name: '',
        method: '',
        identifier: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Wallet created:', formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="bg-blue-50 border-b border-blue-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add New Wallet
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Fill in the details below to manage your payment wallets.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Name *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Main CashApp"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            A nickname for the wallet (e.g., 'Main CashApp', 'Side BTC Wallet')
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Method *
                        </label>
                        <select
                            value={formData.method}
                            onChange={(e) =>
                                setFormData({ ...formData, method: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                            <option value="">The payment method this wallet belongs to.</option>
                            <option>Bitcoin</option>
                            <option>Chime</option>
                            <option>Litecoin</option>
                            <option>PayPal</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Identifier
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., $MyGashTag (Optional)"
                            value={formData.identifier}
                            onChange={(e) =>
                                setFormData({ ...formData, identifier: e.target.value })
                            }
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Optional. The actual address, $cashtag, or email for your reference.
                        </p>
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
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Wallet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
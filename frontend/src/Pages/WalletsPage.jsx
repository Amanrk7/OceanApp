import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle, Plus } from "lucide-react";
import AddWalletModal from "../Components/AddWalletModal";

export default function WalletsPage() {
    const [wallets, setWallets] = useState([
        { id: 1, name: 'ANGELIC.CHIME', method: 'Chime', identifier: 'ANGELIC' },
        {
            id: 2,
            name: 'Dashaunquis',
            method: 'Chime',
            identifier: '$Dashaunquisnew9',
        },
        { id: 3, name: 'Omar Fonseca', method: 'Chime', identifier: '$Omar-98' },
        { id: 4, name: 'grant hale', method: 'Chime', identifier: '---' },
    ]);

    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Add New Wallet
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="border-b border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900">Your Wallets</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">
                                    NAME
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">
                                    METHOD
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">
                                    IDENTIFIER (ADDRESS/CASHTAG)
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-900">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {wallets.map((wallet) => (
                                <tr
                                    key={wallet.id}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                        {wallet.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">
                                        {wallet.method}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                                        {wallet.identifier}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-blue-600 hover:text-blue-700 font-medium">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <AddWalletModal onClose={() => setShowAddModal(false)} />
            )}
        </div>
    );
}
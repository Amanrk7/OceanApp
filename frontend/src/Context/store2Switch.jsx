import { createContext, useState } from "react";

const App2Context = createContext();

const App2Provider = ({ children }) => {
    const [currentStoreId, setCurrentStoreId] = useState(1);

    // ── Backward-compat shims so existing App.jsx/App2.jsx refs still work ──
    const isStore2 = currentStoreId === 2;
    const setIsStore2 = (val) => setCurrentStoreId(val ? 2 : 1);

    return (
        <App2Context.Provider value={{
            isStore2, setIsStore2,          // legacy
            currentStoreId, setCurrentStoreId  // new canonical
        }}>
            {children}
        </App2Context.Provider>
    );
};

export { App2Context, App2Provider };

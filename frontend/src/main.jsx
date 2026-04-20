import { StrictMode, useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { App2Context, App2Provider } from "./Context/store2Switch.jsx";
import api, { setStoreId } from './api.js';

function AppSwitcher() {
    const { currentStoreId } = useContext(App2Context);

    useEffect(() => {
        // Keep api.js and cache in sync whenever store changes
        setStoreId(currentStoreId);
        api.clearCache();
    }, [currentStoreId]);

    // key forces full remount on store change — all local state is cleared
    return <App key={`store-${currentStoreId}`} />;
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App2Provider>
            <AppSwitcher />
        </App2Provider>
    </StrictMode>
);

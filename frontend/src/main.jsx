import { StrictMode, useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { App2Context, App2Provider } from "./Context/store2Switch.jsx";
import api, { setStoreId } from './api.js';

function AppSwitcher() {
    const { currentStoreId } = useContext(App2Context);

    useEffect(() => {
        api.clearCache();
        setStoreId(currentStoreId);
    }, [currentStoreId]);

    // key forces a full remount on store change (clears all local state)
    return <App key={`store${currentStoreId}`} />;
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App2Provider>
            <AppSwitcher />
        </App2Provider>
    </StrictMode>
);

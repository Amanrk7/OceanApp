import { StrictMode, useContext, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import App2 from './App2.jsx';
import { App2Context, App2Provider } from "./Context/store2Switch.jsx";
import api from './api.js';  // ← import the api

function AppSwitcher() {
  const { isStore2 } = useContext(App2Context);

  // ✅ Clear the cache every time the store switches
  useEffect(() => {
    api.clearCache();
  }, [isStore2]);

  return !isStore2 ? <App key="store1" /> : <App2 key="store2" />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App2Provider>
      <AppSwitcher />
    </App2Provider>
  </StrictMode>
);

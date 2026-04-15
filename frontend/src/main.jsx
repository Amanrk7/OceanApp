import { StrictMode, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import App2 from './App2.jsx';
import { App2Context, App2Provider } from "./Context/store2Switch.jsx";

// Create a small component to handle the switch
// function AppSwitcher() {
//   const { isStore2 } = useContext(App2Context); // ✅ Valid: inside a component
//   return !isStore2 ? <App /> : <App2 />;
// }

function AppSwitcher() {
  const { isStore2 } = useContext(App2Context);
  return !isStore2 ? <App key="store1" /> : <App2 key="store2" />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App2Provider>
      <AppSwitcher />
    </App2Provider>
  </StrictMode>
);

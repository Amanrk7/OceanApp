import { StrictMode, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import App2 from './App2.jsx';
import { App2Context, App2Provider } from "./Context/store2Switch.jsx";

const { isStore2 } = useContext(App2Context);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App2Provider>

      {!isStore2
        ? <App /> : <App2 />}

    </App2Provider>
  </StrictMode>,
)

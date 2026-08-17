import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { injectStore } from './services/axiosInstance';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { ToastProvider } from './hooks/useToast';

injectStore(store); 

createRoot(document.getElementById('root')).render(

  <StrictMode>
    <Provider store={store}>
     <ToastProvider> 
      <App />
       </ToastProvider>
    </Provider>
  </StrictMode>
);
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PurchaseProvider } from './context/PurchaseContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const Main = () => (
  <React.StrictMode>
    <PurchaseProvider>
      <App />
    </PurchaseProvider>
  </React.StrictMode>
);

root.render(<Main />);

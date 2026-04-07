import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// NOT: tokens.css statik import KALDIRILDI — çift-mod sistemi için
// AppInner içinden mod === 'yeni' olduğunda dinamik yüklenir.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

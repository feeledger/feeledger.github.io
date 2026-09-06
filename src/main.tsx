import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initialiseDatabase } from './db/indexeddb/initialise.ts'

// Initialise IndexedDB asynchronously — non-blocking, errors are caught internally
initialiseDatabase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

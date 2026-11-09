import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/index.css'
import './styles/parchment.css'
import './styles/help.css'
import { HeroPage } from './pages/HeroPage'

createRoot(document.getElementById('root')!).render(<StrictMode><HeroPage /></StrictMode>)

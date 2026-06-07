import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './screens/Login.jsx'
import Home from './screens/Home.jsx'

const Root = () => {
  const [user, setUser] = useState(null)

  return user ? <Home user={user} /> : <Login onLogin={setUser} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

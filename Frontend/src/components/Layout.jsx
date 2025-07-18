import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const Layout = () => {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar/>
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Footer />
    </div>
  )
}

export default Layout 
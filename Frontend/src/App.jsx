import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Cart from './pages/Cart'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products.jsx'
import About from './pages/About'
import ProductDetail from './pages/ProductDetail.jsx'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import Orders from './pages/Orders'
import Transactions from './pages/Transactions'
import AddProduct from './pages/AddProduct'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout />}>
            <Route path="/home" index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            {/* Protected routes */}
            <Route path="dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="messages" element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            } />
            <Route path="orders" element={
              <PrivateRoute>
                <Orders />
              </PrivateRoute>
            } />
            <Route path="transactions" element={
              <PrivateRoute>
                <Transactions />
              </PrivateRoute>
            } />
            <Route path="/add-product" element={
              <PrivateRoute>
                <AddProduct />
              </PrivateRoute>
            } />

            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App

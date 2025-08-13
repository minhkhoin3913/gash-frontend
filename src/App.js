import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Profile from "./components/Profile";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import Orders from "./components/Orders";
import Layout from "./components/Layout";
import ProductFavorite from "./components/ProductFavorite";
import Search from "./components/Search";
import OTPVerification from "./components/OTPVerification";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Register from "./components/Register";
import Home from "./components/Home";
import BlogPost from "./components/BlogPost";
import Contact from "./components/Contact";
import VNPayReturn from "./components/VNPayReturn";
import ScrollToTop from "./components/ScrollToTop";

const App = () => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/otp-verification" element={<OTPVerification />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/favorites" element={<ProductFavorite />} />
              <Route path="/search" element={<Search />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/register" element={<Register />} />
              <Route path="/news" element={<BlogPost />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/vnpay-return" element={<VNPayReturn />} />

            </Routes>
          </Layout>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;

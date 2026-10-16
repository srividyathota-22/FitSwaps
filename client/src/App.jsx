import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Browse from "./pages/Browse";
import AddItem from "./pages/AddItem";
import ItemDetail from "./pages/ItemDetail";
import RequestSwap from "./pages/RequestSwap";
import Swaps from "./pages/Swaps";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import EditItem from "./pages/EditItem";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import Community from "./pages/Community";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-zinc-500">Loading...</p>;
  return user ? children : <Navigate to="/login" replace />;
}
function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-zinc-500">Loading...</p>;
  return user?.role === "admin" ? children : <Navigate to="/" replace />;
}
function Root() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-zinc-500">Loading...</p>;
  return user ? <Browse /> : <Home />;
}
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <div className="min-h-screen bg-violet-50/60 text-zinc-900">
      <ScrollToTop />
      <Navbar />
      <main className="mx-auto min-h-[75vh] max-w-6xl px-5 py-8">
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/add" element={<Protected><AddItem /></Protected>} />
          <Route path="/items/:id" element={<Protected><ItemDetail /></Protected>} />
          <Route path="/swap/new/:itemId" element={<Protected><RequestSwap /></Protected>} />
          <Route path="/swaps" element={<Protected><Swaps /></Protected>} />
          <Route path="/chat/:swapId" element={<Protected><Chat /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} /> 
          <Route path="/items/:id/edit" element={<Protected><EditItem /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />  
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/community" element={<Community />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
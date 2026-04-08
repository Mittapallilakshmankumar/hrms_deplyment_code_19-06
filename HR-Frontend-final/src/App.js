
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import AccountsApp from "./accounts/AccountsApp";

const ProtectedRoute = ({ children }) => {
  // const token = sessionStorage.getItem("petty-cash-access");
  const token = localStorage.getItem("petty-cash-access");

  // ❌ Not logged in → go to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // ✅ Logged in → allow
  return children;
};

export default function App() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/accounts")) {
    return <AccountsApp />;
  }

  // const token = sessionStorage.getItem("petty-cash-access");
  const token = localStorage.getItem("petty-cash-access");

  return (
    <BrowserRouter>
      <Routes>

        {/* Login page */}
        <Route
          path="/"
          element={token ? <Navigate to="/login" /> : <Login />}
        />

        {/* Protected Home */}
        <Route
          path="/home/*"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* 🔥 IMPORTANT: block all other URLs */}
        <Route
          path="*"
          element={<Navigate to={token ? "/home" : "/"} />}
        />

      </Routes>
    </BrowserRouter>
  );
}



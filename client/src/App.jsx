import "./index.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import appBg from "./assets/images/bg.jpg";
import RoleContext from "./components/common/RoleContext";

import Navbar from "./components/common/Navbar";
import PassengerNavbar from "./components/common/PassengerNavbar";
import BusOwnerNavbar from "./components/common/BusOwnerNavbar";

import Footer from "./components/common/Footer";

import Home from "./pages/Home";
import WelcomePage from "./pages/WelcomePage";
import Signup from "./pages/passenger/Signup";
import Login from "./pages/passenger/Login";
import Logout from "./pages/passenger/Logout";
import BusBookingDashboard from "./pages/BusBookingDashboard";
import UpdateProfile from "./pages/passenger/updateProfile";

import AddBus from "./pages/busOwner/AddBus";
import CompanyRegister from "./pages/busOwner/CompanyRegister";
import BusBookingHistory from "./pages/busOwner/BusBookingHistory";

import CompanyHistory from "./pages/admin/CompanyHistory";

function AppContent() {
  const [userRole, setUserRole] = useState("");
  const location = useLocation();

  // Pages that should NOT show the background image
  const NO_BG_PATHS = new Set(["/", "/about", "/contact", "/home"]);
  // Pages that hide the navbar
  const HIDE_NAV_PATHS = new Set(["/login", "/signup", "/forgotPassword"]);

  const pathname = location.pathname;
  const showGlobalBg = !NO_BG_PATHS.has(pathname);
  const hideNavbar = HIDE_NAV_PATHS.has(pathname);

  // keep role in sync with localStorage
  useEffect(() => {
    setUserRole(localStorage.getItem("role"));
  }, [pathname]);

  const roleContextValue = {
    userRole,
    setUserRole: (newRole) => {
      setUserRole(newRole);
      if (newRole) localStorage.setItem("role", newRole);
      else localStorage.removeItem("role");
    },
  };

  return (
    <RoleContext.Provider value={roleContextValue}>
      {/* Global Toasts */}
      <ToastContainer
        position="top-center"
        theme="colored"
        closeOnClick
        pauseOnHover
        newestOnTop
        draggable
        toastClassName="!bg-[#1D1E2C] !text-white"
        progressClassName="!bg-gradient-to-r from-[#2DE2E6] to-[#FF6EC7]"
      />

      {/* Page wrapper with optional background */}
      <div
        className={`min-h-screen flex flex-col ${
          showGlobalBg ? "bg-page" : ""
        }`}
        style={showGlobalBg ? { "--page-bg": `url(${appBg})` } : undefined}
      >
        {/* NAVBAR */}
        {!hideNavbar && (
          <header className="sticky top-0 z-50 bg-[#1D1E2C]/95 backdrop-blur-sm">
            {userRole === "passenger" ? (
              <PassengerNavbar />
            ) : userRole === "busOwner" ? (
              <BusOwnerNavbar />
            ) : (
              <Navbar />
            )}
          </header>
        )}

        {/* MAIN */}
        <main className={`flex-1 ${hideNavbar ? "" : "pt-6"}`}>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/" element={<WelcomePage />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route
              path="/busBookingDashboard"
              element={<BusBookingDashboard />}
            />
<Route path="/updateProfile" element={<UpdateProfile />} />
            <Route path="/addBus" element={<AddBus />} />
            <Route path="/companyRegister" element={<CompanyRegister />} />
            <Route path="/busBookingHistory" element={<BusBookingHistory />} />
            <Route path="/companyHistory" element={<CompanyHistory />} />
          </Routes>

          <div className="h-8" />
        </main>

        {/* FOOTER */}
        {!hideNavbar && <Footer />}
      </div>
    </RoleContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

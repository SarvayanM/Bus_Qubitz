import "./index.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import "react-toastify/dist/ReactToastify.css";

// import appBg from "./assets/images/bg.jpg";
import RoleContext from "./components/common/RoleContext";

import Navbar from "./components/common/Navbar";
import PassengerNavbar from "./components/passenger/PassengerNavbar";
import BusOwnerNavbar from "./components/common/BusOwnerNavbar";
import Journeys from "./components/common/Journeys";
import Footer from "./components/common/Footer";

import Home from "./pages/Home";

import Signup from "./pages/passenger/Signup";
import Login from "./pages/passenger/Login";
import Logout from "./pages/passenger/Logout";
import BusBookingDashboard from "./pages/passenger/BusBookingDashboard";
import UpdateProfile from "./pages/passenger/updateProfile";
import BookingHistory from "./pages/passenger/BookingHistory";
import SelectedBusDetails from "./pages/passenger/SelectedBusDetails";
import CheckoutSummary from "./pages/passenger/CheckoutSummary";

import AddBus from "./pages/busOwner/AddBus";
import CompanyRegister from "./pages/busOwner/CompanyRegister";
import BusBookingHistory from "./pages/busOwner/BusBookingHistory";
import ManageBuses from "./pages/busOwner/ManageBuses";

import CompanyHistory from "./pages/admin/CompanyHistory";
import CompanyLogin from "./pages/busOwner/CompanyLogin";

function AppContent() {
  const [userRole, setUserRole] = useState("");
  const location = useLocation();

  // Pages that should NOT show the background image
  const NO_BG_PATHS = new Set([
    "/",
    "/about",
    "/contact",
    "/home",
    "/manageBuses",
  ]);
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
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Global Toasts */}

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
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route
              path="/busBookingDashboard"
              element={<BusBookingDashboard />}
            />
            <Route path="/journeys" element={<Journeys />} />
            <Route path="/updateProfile" element={<UpdateProfile />} />
            <Route path="/addBus" element={<AddBus />} />
            <Route path="/companyRegister" element={<CompanyRegister />} />
            <Route path="/busBookingHistory" element={<BusBookingHistory />} />
            <Route path="/manageBuses" element={<ManageBuses />} />
            <Route path="/companyHistory" element={<CompanyHistory />} />
            <Route path="/companyLogin" element={<CompanyLogin />} />
            <Route path="/bookingHistory" element={<BookingHistory />} />
            <Route
              path="/selectedBusDetails"
              element={<SelectedBusDetails />}
            />
            <Route path="/checkoutSummary" element={<CheckoutSummary />} />
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

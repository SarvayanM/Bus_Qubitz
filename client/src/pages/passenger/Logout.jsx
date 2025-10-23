// src/pages/Logout.jsx
import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie"; // ✅ for clearing cookies
import RoleContext from "../../components/common/RoleContext";
import { logout } from "../../api/passenger"; // ✅ backend logout API

function Logout() {
  const navigate = useNavigate();
  const { setUserRole } = useContext(RoleContext);

  useEffect(() => {
    (async () => {
      try {
        // Call backend logout API (if available)
        const res = await logout();

        if (res?.success || res?.status === 200) {
          // ✅ Clear local storage
          localStorage.removeItem("role");
          localStorage.removeItem("email");
          localStorage.removeItem("userPhone");

          // ✅ Clear session storage
          sessionStorage.clear();

          // ✅ Remove cookies
          Cookies.remove("phone");
          Cookies.remove("phone_verified");
          Cookies.remove("companyId"); // optional if used in your app
          Cookies.remove("session"); // just in case a session cookie exists

          // ✅ Reset role context
          setUserRole(null);

          // ✅ Toast feedback
          toast.success("Logged out successfully", {
            toastId: "logout-success",
            autoClose: 2000,
            position: "top-center",
          });

          // ✅ Redirect to homepage after short delay
          setTimeout(() => navigate("/"), 700);
        } else {
          throw new Error("Server logout failed");
        }
      } catch (err) {
        console.error("Logout error:", err);
        toast.error(err.message || "Logout failed", {
          toastId: "logout-error",
          position: "top-center",
        });
      }
    })();
  }, [navigate, setUserRole]);

  return null;
}

export default Logout;

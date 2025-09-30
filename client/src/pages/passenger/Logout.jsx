import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RoleContext from "../../components/common/RoleContext";
import { logout } from "../../api/passenger"; // ✅ import API

function Logout() {
  const navigate = useNavigate();
  const { setUserRole } = useContext(RoleContext);

  useEffect(() => {
    (async () => {
      try {
        const res = await logout();
        if (res.success) {
          localStorage.removeItem("role");
          localStorage.removeItem("email");
          setUserRole(null);

          toast.success("Logged Out Successfully", {
            toastId: "logout-success",
            autoClose: 2000,
            position: "top-center", // ✅ Centered toast
          });

          setTimeout(() => navigate("/"), 500);
        }
      } catch (err) {
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

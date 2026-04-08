import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react"; // ✅ added
 
export default function Login() {
  const navigate = useNavigate();
 
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
 
  const [error, setError] = useState("");
 
  const [showPassword, setShowPassword] = useState(false); // ✅ added
 
  const handleSubmit = async (e) => {
    e.preventDefault();
 
    // clear old
    sessionStorage.clear();
    localStorage.clear();
 
    try {
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
 
      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);
 
      if (res.ok) {
        // tokens
        localStorage.setItem("petty-cash-access", data.access);
        localStorage.setItem("petty-cash-refresh", data.refresh);
 
        // role
        const role = data.role || "employee";
 
        localStorage.setItem("role", role);
        localStorage.setItem("userId", data.user_id || "");
        localStorage.setItem("userName", data.name || "");
        localStorage.setItem("employeeId", data.employee_id || "");
 
        // redirect
        if (role.toLowerCase() === "admin") {
          navigate("/home");
        } else {
          navigate("/home");
        }
 
      } else {
        setError("Invalid credentials ❌");
      }
 
    } catch (err) {
      console.error(err);
      setError("Server error ❌");
    }
  };
 
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#082a57]">
      <div className="bg-white p-8 rounded-xl w-96 shadow-lg">
 
        <h2 className="text-xl font-bold mb-4 text-center">
          Login
        </h2>
 
        {error && <p className="text-red-500 text-center mb-3">{error}</p>}
 
        <form onSubmit={handleSubmit}>
 
          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            className="w-full mb-3 p-2 border rounded"
            required
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
 
          {/* PASSWORD WITH EYE ICON */}
          <div className="relative mb-3">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full p-2 border rounded pr-10"
              required
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
 
            <span
              className="absolute right-3 top-2.5 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
 
          {/* LOGIN BUTTON */}
          <button className="w-full bg-blue-900 text-white p-2 rounded">
            Login
          </button>
 
          {/* ACCOUNTS BUTTON */}
          <button
            type="button"
            onClick={() => {
              window.location.href = "/accounts";
            }}
            className="w-full mt-3 bg-green-600 text-white p-2 rounded hover:bg-green-500"
          >
            Accounts
          </button>
 
        </form>
      </div>
    </div>
  );
}



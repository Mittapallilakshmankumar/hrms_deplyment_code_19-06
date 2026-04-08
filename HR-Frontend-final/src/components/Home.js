import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import RoleCards from "./RoleCards";
import EmployeeRequestForm from "./EmployeeRequestForm";
import EmployeeRequestsTable from "./EmployeeRequestsTable";
import HrApprovalTable from "./HrApprovalTable";
import AddCandidateModal from "./AddCandidateModal";
import CandidateTable from "./CandidateTable";
import ApproveLeave from "./ApproveLeave";

// 🔥 ADD THIS HERE
const user = {
  name: localStorage.getItem("userName") || "User",
  userId: localStorage.getItem("employeeId") || "",
  role: "HR Executive",
  department: "Human Resources"
};


function Layout({ title, children }) {
  return (
<div className="flex min-h-screen bg-[#f4f7fb]">
<Sidebar />
 
      <div className="flex-1 flex flex-col">
<div className="p-4 md:p-6">
<Navbar />
<main className="mt-6">{children}</main>
</div>
</div>
</div>
  );
}



function HomePage() {
  const navigate = useNavigate();

const user = {
  name: localStorage.getItem("userName") || "User",
  // role: "HR Executive",
  // department: "Human Resources",
  userId: localStorage.getItem("employeeId") || "",
};
// ✅ STEP 1
  const [dashboard, setDashboard] = useState({});

  // 👉 ADD HERE (STEP 1)
const [attendance, setAttendance] = useState(null);
 // ✅ ADD THIS HERE
  const [userDept, setUserDept] = useState("");

  
  // 👉 ADD HERE (STEP 2)
useEffect(() => {
  const userId = localStorage.getItem("userId");

  fetch(`http://127.0.0.1:8000/api/attendance/attendance/?user_id=${userId}`)
    .then(res => res.json())
    .then(data => {

      // ✅ count only THIS USER present days
      const presentCount = data.filter(
        (item) => item.check_in && item.check_out
      ).length;

      const absentCount = data.filter(
        (item) => !item.check_in
      ).length;

      // ✅ update dashboard values
      setDashboard((prev) => ({
        ...prev,
        present_days: presentCount,
        absent_days: absentCount,
      }));

      // keep this
      const today = new Date().toISOString().slice(0, 10);

      const todayRecord = data.find(d => d.date === today);
      setAttendance(todayRecord);
    });
}, []);
useEffect(() => {
  const userId = localStorage.getItem("userId");

  fetch(`http://127.0.0.1:8000/api/app1/employees/?user_id=${userId}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        setUserDept(data[0].department);
      }
    });
}, []);
useEffect(() => {
  const userId = localStorage.getItem("userId");

  fetch(`http://127.0.0.1:8000/api/leave/list/?user_id=${userId}`)
    .then(res => res.json())
    .then(data => {
      console.log("LEAVE DATA:", data);

      const pendingCount = data.filter(
        (item) => item.status === "Pending"
      ).length;

      setDashboard((prev) => ({
        ...prev,
        pending_requests: pendingCount,
      }));
    });
}, []);

  const hour = new Date().getHours();
  let greeting = "Hello";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const companySchedule = [
    {
      day: "Monday",
      short: "Mon",
      time: "10:00 AM - 07:00 PM",
      status: "Working Day",
      badge: "bg-green-100 text-green-700",
      card: "bg-green-50 border-green-200",
    },
    {
      day: "Tuesday",
      short: "Tue",
      time: "10:00 AM - 07:00 PM",
      status: "Working Day",
      badge: "bg-green-100 text-green-700",
      card: "bg-green-50 border-green-200",
    },
    {
      day: "Wednesday",
      short: "Wed",
      time: "10:00 AM - 07:00 PM",
      status: "Working Day",
      badge: "bg-green-100 text-green-700",
      card: "bg-green-50 border-green-200",
    },
    {
      day: "Thursday",
      short: "Thu",
      time: "10:00 AM - 07:00 PM",
      status: "Working Day",
      badge: "bg-green-100 text-green-700",
      card: "bg-green-50 border-green-200",
    },
    {
      day: "Friday",
      short: "Fri",
      time: "10:00 AM - 07:00 PM",
      status: "Working Day",
      badge: "bg-green-100 text-green-700",
      card: "bg-green-50 border-green-200",
    },
    {
      day: "Saturday",
      short: "Sat",
      time: "10:00 AM - 07:00 PM",
      status: "working day",
       badge: "bg-green-100 text-green-700",
      card: "bg-green-50 border-green-200",
    },
    {
      day: "Sunday",
      short: "Sun",
      time: "Week Off",
      status: "Holiday",
      badge: "bg-red-100 text-red-700",
      card: "bg-red-50 border-red-200",
    },

  // your schedule data
];

// 👉 STEP 3 ADD HERE (EXACT PLACE)
let status = "Absent";

if (attendance?.check_in && !attendance?.check_out) {
  status = "Working";
}

if (attendance?.check_in && attendance?.check_out) {
  status = "Present";
}

// 👉 BELOW THIS YOU WILL SEE return()

  return (
    <Layout>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {greeting}, {user.name}
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              {/* {user.role} • {user.department} */}
              {user.role} • {userDept}
            </p>
            <p className="text-gray-400 mt-2">{today}</p>
          </div>

          <div className="bg-blue-50 rounded-2xl px-5 py-4 min-w-[220px]">
            <p className="text-sm text-blue-600 font-medium">user ID</p>
            <h2 className="text-2xl font-bold text-blue-800 mt-1">
              {user.userId}
            </h2>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Company Work Schedule
            </h2>
            <p className="text-gray-500 mt-1">
              Standard weekly shift timing for users
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-blue-50 px-4 py-2 rounded-xl">
              <p className="text-xs text-blue-600 font-medium">Shift</p>
              <p className="text-sm font-semibold text-blue-800">
                General Shift
              </p>
            </div>
            <div className="bg-purple-50 px-4 py-2 rounded-xl">
              <p className="text-xs text-purple-600 font-medium">Hours</p>
              <p className="text-sm font-semibold text-purple-800">9 hrs/day</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="text-sm text-gray-500">Working Days</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">Mon - Fri</h3>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="text-sm text-gray-500">working days</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">Saturday</h3>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="text-sm text-gray-500">Weekly Off</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">Sunday</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4">
          {companySchedule.map((item, index) => (
            <div
              key={index}
              className={`rounded-2xl border p-4 ${item.card}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  {item.short}
                </p>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-medium ${item.badge}`}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-2">{item.day}</p>

              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-800 leading-5">
                  {item.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
        
          <div
  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Leave Balance</p>
          
          <h2 className="text-3xl font-bold text-gray-800 mt-2">
  {dashboard.leave_balance || 12}
</h2>

          <p className="text-sm text-gray-400 mt-2">Available this year</p>
        </div>

       
        <div
  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">

          <p className="text-sm text-gray-500">Pending Requests</p>
          {/* <h2 className="text-3xl font-bold text-gray-800 mt-2">03</h2> */}
          <h2 className="text-3xl font-bold text-gray-800 mt-2">
  {dashboard.pending_requests || 0}
</h2>
          <p className="text-sm text-gray-400 mt-2">Awaiting approval</p>
        </div>

       
        <div
  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Present Days</p>
      
          <h2 className="text-3xl font-bold text-gray-800 mt-2">
  {dashboard.present_days || 0}
</h2>
          <p className="text-sm text-gray-400 mt-2">This month</p>
        </div>

        
          <div
  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Absent Days</p>
      
          <h2 className="text-3xl font-bold text-gray-800 mt-2">
  {dashboard.absent_days || 0}
</h2>
          <p className="text-sm text-gray-400 mt-2">This month</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
        <h2 className="text-2xl font-bold text-gray-800">Quick Actions</h2>
        <p className="text-gray-500 mt-1">
          Access your frequently used HR actions quickly.
        </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6"> 
          <div
            onClick={() => navigate("/home/leave")}
            className="bg-gray-50 rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold text-gray-800">Apply Leave</h3>
            <p className="text-sm text-gray-500 mt-2">
              Submit a leave request quickly
            </p>
          </div> 

          <div
            onClick={() => navigate("/home/attendance")}
            className="bg-gray-50 rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold text-gray-800">
              View Attendance
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Check daily and monthly attendance
            </p>
          </div>

         

          <div
            onClick={() => navigate("/home/shift-details")}
            className="bg-gray-50 rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold text-gray-800">
              Shift Details
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              See your work shift and timings
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function LeaveBalancePage() {
  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Casual Leave</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">5 Days</h2>
          <p className="text-sm text-gray-400 mt-2">Remaining</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Sick Leave</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">4 Days</h2>
          <p className="text-sm text-gray-400 mt-2">Remaining</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Earned Leave</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">3 Days</h2>
          <p className="text-sm text-gray-400 mt-2">Remaining</p>
        </div>
      </div>
    </Layout>
  );
}

function PendingRequestsPage() {
  return (
    <Layout>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            Casual Leave Request
          </h2>
          <p className="text-gray-500 mt-2">Date: 20 Mar 2026 - 21 Mar 2026</p>
          <p className="text-yellow-600 font-medium mt-2">Pending Approval</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            Sick Leave Request
          </h2>
          <p className="text-gray-500 mt-2">Date: 25 Mar 2026</p>
          <p className="text-yellow-600 font-medium mt-2">Pending Approval</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            Permission Request
          </h2>
          <p className="text-gray-500 mt-2">Date: 28 Mar 2026</p>
          <p className="text-yellow-600 font-medium mt-2">Pending Approval</p>
        </div>
      </div>
    </Layout>
  );
}

function PresentDaysPage() {
  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">This Month</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">21 Days</h2>
          <p className="text-sm text-gray-400 mt-2">Marked Present</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Attendance Percentage</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">91%</h2>
          <p className="text-sm text-gray-400 mt-2">Current month</p>
        </div>
      </div>
    </Layout>
  );
}

function AbsentDaysPage() {
  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">This Month</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">02 Days</h2>
          <p className="text-sm text-gray-400 mt-2">Marked Absent</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Reason</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-2">Personal</h2>
          <p className="text-sm text-gray-400 mt-2">As per records</p>
        </div>
      </div>
    </Layout>
  );
}


function ShiftDetailsPage() {
  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Shift Name</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-2">
            General Shift
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Login Time</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-2">10:00 AM</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Logout Time</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-2">07:00 PM</h2>
        </div>
      </div>
    </Layout>
  );
}



function OnboardingPage() {
  const [candidates, setCandidates] = useState([]);
  const [showModal, setShowModal] = useState(false);

    // 🔥 ADD HERE (IMPORTANT)

  const role = localStorage.getItem("role");
  
   

 const fetchData = () => {
  fetch("http://127.0.0.1:8000/api/app1/list/")
    .then(res => res.json())
    .then(data => setCandidates(data.data || data));
};
 // 🔥 ADD THIS HERE
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Layout>
      <div className="bg-white rounded-2xl shadow-sm p-6">

        <div className="flex justify-between mb-4">
          <h1 className="text-xl font-bold">Onboarding</h1>

  
  
  {role === "admin" && (
  <button
    onClick={() => setShowModal(true)}
    className="bg-blue-600 text-white px-4 py-2 rounded"
  >
    + Add Candidate
  </button>
)}
  
  
        </div>

        {showModal && (
          <AddCandidateModal
            closeModal={() => setShowModal(false)}
            addCandidate={fetchData}   // ✅ CORRECT

          />
        )}

        <CandidateTable candidates={candidates} />
        
      </div>
    </Layout>
  );
}
function LeavePage() {
  const [requests, setRequests] = useState([]);

const addRequest = (newRequest) => {
  setRequests((prev) => [newRequest, ...prev]);
};
return (
  <Layout>
    <div className="space-y-6">

      <div className="bg-white rounded-2xl shadow-sm p-6 border">
        <h1 className="text-2xl font-bold">Leave Management</h1>
      </div>

      <EmployeeRequestForm onAddRequest={addRequest} />
      <EmployeeRequestsTable requests={requests} />

    </div>
  </Layout>
);
}


function AttendancePage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div>
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Attendance Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Manage check-in, check-out and attendance tracker
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            // onClick={() => navigate("/attendance/check-in")}
            onClick={() => navigate("/home/attendance/check-in")}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              Login (Check-In)
            </h2>
            <p className="text-gray-500 mt-3">
              Start your work day by marking attendance
            </p>
            <div className="mt-6 text-green-600 font-semibold">
              Go to Check-In →
            </div>
          </div>

          <div
            // onClick={() => navigate("/attendance/check-out")}
            onClick={() => navigate("/home/attendance/check-out")}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              Logout (Check-Out)
            </h2>
            <p className="text-gray-500 mt-3">
              End your work day and submit summary
            </p>
            <div className="mt-6 text-red-600 font-semibold">
              Go to Check-Out →
            </div>
          </div>

          <div
            // onClick={() => navigate("/attendance/tracker")}
            onClick={() => navigate("/home/attendance/tracker")}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              Attendance Tracker
            </h2>
            <p className="text-gray-500 mt-3">
              View attendance timeline and reports
            </p>
            <div className="mt-6 text-blue-600 font-semibold">
              View Tracker →
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
function CheckInPage() {
  const userName = localStorage.getItem("userName");
  const empId = localStorage.getItem("employeeId");

  const [now, setNow] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastLoginName, setLastLoginName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
  e.preventDefault();

  const res = await fetch("http://127.0.0.1:8000/api/attendance/check-in/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: localStorage.getItem("userId"),
      notes: notes,
    }),
  });

  const data = await res.json(); // 🔥 IMPORTANT

  // 🔥 HANDLE RESPONSE
  if (data.message === "Already checked in") {
    alert("Already checked in today ❌");

      setTimeout(() => {
    navigate("/home/attendance");   // ✅ REDIRECT
  }, 1000);
    return;
  }

  if (data.message === "Check-in success") {
    setLastLoginName(userName);
    setSubmitted(true);
    setNotes("");

    setTimeout(() => {
      // navigate("/home");
        navigate("/home/attendance");
    }, 1000);
  }
};

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[70vh] relative">
        <div className={`w-full max-w-md bg-white rounded-lg shadow-sm border ${submitted ? "blur-sm" : ""}`}>

          <div className="bg-green-50 border-b py-3">
            <h2 className="text-center font-semibold">Login (Check-In)</h2>
          </div>

          <form className="p-6 space-y-4" onSubmit={handleSubmit}>

            {/* Name */}
            <input value={userName} readOnly className="w-full border p-2 bg-gray-100" />

            {/* Emp ID */}
            <input value={empId} readOnly className="w-full border p-2 bg-gray-100" />

            {/* Date */}
            <input value={now.toLocaleDateString()} readOnly className="w-full border p-2 bg-gray-50" />

            {/* Time */}
            <input value={now.toLocaleTimeString()} readOnly className="w-full border p-2 bg-gray-50" />

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter your work plan..."
              className="w-full border p-2"
            />

            <button className="w-full bg-green-600 text-white py-2 rounded">
              Submit
            </button>

          </form>
        </div>

        {/* SUCCESS POPUP */}
        {submitted && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/20"></div>

            <div className="bg-white p-6 rounded text-center z-10">
              <h2 className="text-green-600 font-bold">Check-In Successful</h2>
              <p>{lastLoginName}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
function CheckOutPage() {
  const userName = localStorage.getItem("userName");
  const empId = localStorage.getItem("employeeId");

  const [now, setNow] = useState(new Date());
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastLoginName, setLastLoginName] = useState("");
  const navigate = useNavigate();   // ✅ ADD THIS

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
  e.preventDefault();

  const res = await fetch("http://127.0.0.1:8000/api/attendance/check-out/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: localStorage.getItem("userId"),
      summary: summary,
    }),
  });

  const data = await res.json(); // 🔥 IMPORTANT

  if (data.message === "Already checked out") {
    alert("Already checked out ❌");

    setTimeout(() => {
    navigate("/home/attendance");   // ✅ MOVE PAGE
  }, 1000);

    return;
  }

  if (data.message === "No check-in found") {
    alert("Please check-in first ❌");
    
    return;
  }

  if (data.message === "Check-out success") {
    setLastLoginName(userName);
    setSubmitted(true);
    setSummary("");
  }
   setTimeout(() => {
    navigate("/home/attendance");   // ✅ ADD THIS
  }, 1000);
};

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[70vh] relative">
        <div className={`w-full max-w-md bg-white rounded-lg shadow-sm border ${submitted ? "blur-sm" : ""}`}>

          <div className="bg-red-50 border-b py-3">
            <h2 className="text-center font-semibold">Logout (Check-Out)</h2>
          </div>

          <form className="p-6 space-y-4" onSubmit={handleSubmit}>

            {/* Name */}
            <input value={userName} readOnly className="w-full border p-2 bg-gray-100" />

            {/* Emp ID */}
            <input value={empId} readOnly className="w-full border p-2 bg-gray-100" />

            {/* Date */}
            <input value={now.toLocaleDateString()} readOnly className="w-full border p-2 bg-gray-50" />

            {/* Time */}
            <input value={now.toLocaleTimeString()} readOnly className="w-full border p-2 bg-gray-50" />

            {/* Summary */}
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter your work summary..."
              className="w-full border p-2"
            />

            <button className="w-full bg-red-600 text-white py-2 rounded">
              Submit
            </button>

          </form>
        </div>

        {/* SUCCESS POPUP */}
        {submitted && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/20"></div>

            <div className="bg-white p-6 rounded text-center z-10">
              <h2 className="text-red-600 font-bold">Check-Out Successful</h2>
              <p>{lastLoginName}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
function TrackerPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    fetch(`http://127.0.0.1:8000/api/attendance/attendance/?user_id=${userId}`)
      .then(res => res.json())
      .then(resData => setData(resData));
  }, []);
  

  const getHours = (inTime, outTime) => {
    if (!inTime || !outTime) return "-";

    const [h1, m1] = inTime.split(":").map(Number);
    const [h2, m2] = outTime.split(":").map(Number);

    return ((h2 * 60 + m2 - (h1 * 60 + m1)) / 60).toFixed(1);
  };

  return (
    <Layout>
      <div className="bg-white rounded-2xl p-6">

        <h2 className="text-xl font-bold mb-4">
          My Attendance
        </h2>

        <table className="w-full text-sm border">

          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Date</th>
              <th className="p-2">Check In</th>
              <th className="p-2">Check Out</th>
              <th className="p-2">Hours</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, i) => {

              const checkIn = item.check_in?.slice(0,5);
              const checkOut = item.check_out?.slice(0,5);

              let status = "Absent";

              if (checkIn && !checkOut) status = "Working";
              if (checkIn && checkOut) status = "Present";

              return (
                <tr key={i} className="text-center border-t">

                  <td className="p-2">{item.date}</td>

                  <td className="p-2">{checkIn || "-"}</td>

                  <td className="p-2">{checkOut || "-"}</td>

                  <td className="p-2">
                    {getHours(checkIn, checkOut)}
                  </td>

                  <td className="p-2">
                    {status}
                  </td>

                </tr>
              );
            })}
          </tbody>

        </table>

      </div>
    </Layout>
  );
}
export default function Home() {
  return (
    
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/leave-balance" element={<LeaveBalancePage />} />
        <Route path="/pending-requests" element={<PendingRequestsPage />} />
        <Route path="/present-days" element={<PresentDaysPage />} />
        <Route path="/absent-days" element={<AbsentDaysPage />} />
        {/* <Route path="/leave-requests" element={<LeaveRequestsPage />} /> */}
        <Route path="/shift-details" element={<ShiftDetailsPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/attendance/check-in" element={<CheckInPage />} />
        <Route path="/attendance/check-out" element={<CheckOutPage />} />
        <Route path="/attendance/tracker" element={<TrackerPage />} />
        <Route path="/leaveapprove" element={< ApproveLeave />} />        
      </Routes>
    
  );
}


import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import HrApprovalTable from "./HrApprovalTable";
import EmployeesList from "./EmployeesList";
import CandidatesList from "./CandidatesList";

export default function ApproveLeave() {
  const handleRefresh = () => {
  setSelectedDate("");
  setSelectedMonth("");
};

  const [isAdminLogged] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    half_day: 0
  });

  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  // ✅ ADD HERE
const [selectedMonth, setSelectedMonth] = useState("");

  // 🔥 FETCH DATA
  useEffect(() => {
    if (isAdminLogged) {

      let url = "http://127.0.0.1:8000/api/attendance/admin-dashboard/";

// 🔥 PRIORITY
if (selectedDate) {
  url = `http://127.0.0.1:8000/api/attendance/by-date/?date=${selectedDate}`;
}
else if (selectedMonth) {
  url = `http://127.0.0.1:8000/api/attendance/by-month/?month=${selectedMonth}`;
}

      fetch(url)
        .then(res => res.json())
        .then(data => {

          setAttendanceData(data);

          let total = data.length;
          let present = 0;
          let absent = 0;

          data.forEach(emp => {
            const status = (emp.today_status || emp.status || "").toLowerCase();

            if (status === "present") present++;
            else absent++;
          });

          setStats({
            total,
            present,
            absent,
            half_day: 0
          });

        })
        .catch(err => console.log(err));
    }
  }, [isAdminLogged, selectedDate]);

  return (
    <div className="flex">

      <Sidebar />

      <div className="flex-1 p-6 bg-gray-100 min-h-screen">

        <div className="space-y-6">

          {/* DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            <div className="bg-white p-5 rounded-2xl shadow">
              <p>Total Employees</p>
              <h2 className="text-3xl font-bold">{stats.total}</h2>
            </div>

            <div className="bg-green-100 p-5 rounded-2xl">
              <p>Present</p>
              <h2 className="text-3xl font-bold">{stats.present}</h2>
            </div>

            <div className="bg-red-100 p-5 rounded-2xl">
              <p>Absent</p>
              <h2 className="text-3xl font-bold">{stats.absent}</h2>
            </div>

            <div className="bg-yellow-100 p-5 rounded-2xl">
              <p>Half Day</p>
              <h2 className="text-3xl font-bold">{stats.half_day}</h2>
            </div>

          </div>

          {/* DATE PICKER */}
          <h2 className="font-bold text-lg">Attendance Table</h2>
          <button
  onClick={handleRefresh}
  className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
>
  Refresh
</button>

          <input
            type="date"
            className="border p-2 mb-4"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <input
  type="month"
  className="border p-2 mb-4 ml-2"
  value={selectedMonth}
  onChange={(e) => {
    setSelectedMonth(e.target.value);
    setSelectedDate(""); // clear date
  }}
/>

          {/* TABLE */}
          <table className="w-full border bg-white">
            <thead>
              <tr>
                <th className="border p-2">Emp ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Login Time</th>
                <th className="border p-2">Logout Time</th>
                <th className="border p-2">Present</th>
                <th className="border p-2">Absent</th>
                <th className="border p-2">Total</th>
              </tr>
            </thead>

            <tbody>
              {attendanceData.length > 0 ? (
                attendanceData.map((emp) => {

                  const status = emp.today_status || emp.status;

                  return (
                    <tr key={emp.employee_id} className="text-center">

                      <td className="border p-2">{emp.employee_id}</td>
                      <td className="border p-2">{emp.name}</td>

                      {/* STATUS */}
                      <td
                        className={`border p-2 font-bold ${
                          status === "Present"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {status}
                      </td>

                      {/* LOGIN */}
                      <td className="border p-2">
                        {emp.login_time || "Not Logged In"}
                      </td>

                      {/* LOGOUT */}
                      <td className="border p-2">
                        {emp.logout_time || "Not Logged Out"}
                      </td>

                      {/* PRESENT */}
                      <td className="border p-2 text-green-600">
                        {selectedDate
                          ? (status === "Present" ? 1 : 0)
                          : emp.present_days}
                      </td>

                      {/* ABSENT */}
                      <td className="border p-2 text-red-600">
                        {selectedDate
                          ? (status === "Absent" ? 1 : 0)
                          : emp.absent_days}
                      </td>

                      {/* TOTAL */}
                      <td className="border p-2">
                        {selectedDate ? 1 : emp.total_days}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="p-4 text-center">
                    No Data Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <HrApprovalTable />
          <EmployeesList />
          <CandidatesList />

        </div>
      </div>
    </div>
  );
}
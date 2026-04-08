import { useEffect, useState } from "react";

export default function EmployeesList() {

  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/app1/employees/")
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(err => console.log(err));
  }, []);

  const openModal = (emp) => {
    setSelectedEmp(emp);
    setShowModal(true);
  };

  const handleReset = async () => {
    if (!newPassword) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/attendance/admin-reset-password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: selectedEmp.employee_id,
          email: selectedEmp.email,
          new_password: newPassword
        }),
      });

      const data = await res.json();
      alert(data.message);

      setShowModal(false);
      setNewPassword("");

    } catch (error) {
      console.log(error);
    }
  };

  const handleExit = async (id) => {
    const confirmExit = window.confirm("Are you sure?");
    if (!confirmExit) return;

    await fetch(`http://127.0.0.1:8000/api/app1/employees/${id}/exit/`, {
      method: "PATCH",
    });

    fetch("http://127.0.0.1:8000/api/app1/employees/")
      .then(res => res.json())
      .then(data => setEmployees(data));
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-6">

      <h2 className="text-xl font-bold mb-4 text-gray-700">
        Employees List
      </h2>

      {/* ✅ SCROLL FIX */}
      <div className="overflow-x-auto">

        {/* ✅ IMPORTANT FIX: remove min-w-full + add minWidth */}
        <table
          className="border border-gray-200 rounded-lg"
          style={{ minWidth: "1200px" }}
        >

          {/* HEADER */}
          <thead className="bg-gray-100 text-gray-700 text-sm uppercase">
            <tr className="text-left">
              <th className="p-3 border">Emp ID</th>
              <th className="p-3 border">Name</th>
              <th className="p-3 border">Email</th>
              <th className="p-3 border">Phone</th>
              <th className="p-3 border">Department</th>
              <th className="p-3 border">Role</th>
              <th className="p-3 border">Joining Date</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Action</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="text-sm text-left">

            {employees.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-4 text-gray-400 text-center">
                  No Employees Found
                </td>
              </tr>
            ) : (
              employees.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">

                  <td className="p-3 border font-semibold text-blue-600">
                    {item.employee_id}
                  </td>

                  <td
                    className="p-3 border"
                    style={{ minWidth: "150px" }}
                  >
                    {item.name}
                  </td>

                  {/* 🔥 MAIN FIX */}
                  <td
                    className="p-3 border"
                    style={{ minWidth: "250px", wordBreak: "break-word" }}
                  >
                    {item.email}
                  </td>

                  <td className="p-3 border">
                    {item.phone || "-"}
                  </td>

                  <td
                    className="p-3 border"
                    style={{ minWidth: "200px" }}
                  >
                    {item.department || "-"}
                  </td>

                  <td className="p-3 border">
                    {item.role || "-"}
                  </td>

                  <td className="p-3 border">
                    {item.date_of_joining || "-"}
                  </td>

                  <td className="p-3 border text-green-600 font-semibold">
                    {item.is_active ? "Active" : "Inactive"}
                  </td>

                  <td className="p-3 border">
                    <button
                      onClick={() => openModal(item)}
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      Reset
                    </button>

                    <button
                      onClick={() => handleExit(item.id)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded ml-2"
                    >
                      Exit
                    </button>
                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">

          <div className="bg-white p-6 rounded-xl w-80 shadow-lg">

            <h3 className="text-lg font-bold mb-4 text-center">
              Reset Password
            </h3>

            <p className="text-sm mb-2 text-gray-600 text-center">
              {selectedEmp?.name}
            </p>

            <input
              type="password"
              placeholder="Enter new password"
              className="border p-2 w-full rounded mb-4"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <div className="flex justify-between">

              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleReset}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
              >
                Update
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}



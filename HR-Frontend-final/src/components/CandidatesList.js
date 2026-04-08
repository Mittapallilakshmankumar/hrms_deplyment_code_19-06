import { useEffect, useState } from "react";

export default function CandidatesList() {

  const [candidates, setCandidates] = useState([]);

  // ✅ FETCH DATA
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/app1/list/", {
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("petty-cash-access")}`
  }
})
      .then(res => res.json())
      .then(data => {
        console.log("API DATA:", data);

        if (Array.isArray(data)) {
          setCandidates(data);
        } else if (Array.isArray(data.data)) {
          setCandidates(data.data);
        } else if (Array.isArray(data.results)) {
          setCandidates(data.results);
        } else {
          setCandidates([]);
        }
      })
      .catch(err => console.log("Error:", err));
  }, []);

  // ✅ APPROVE FUNCTION
const approveCandidate = async (id) => {
  try {
    const res = await fetch(
  `http://127.0.0.1:8000/api/app1/approve-candidate/${id}/`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("petty-cash-access")}`,
      "Content-Type": "application/json"
    }
  }
);

    const data = await res.json();

    console.log("APPROVE RESPONSE:", data);

    // ❌ if error from backend
    if (!res.ok || data.error) {
      alert("Error ❌: " + (data.error || "Something failed"));
      return;
    }

    // ✅ success
    alert("Approved ✅\nEMP ID: " + data.employee_id);

    setCandidates(prev => prev.filter(item => item.id !== id));

  } catch (err) {
    console.log("Error:", err);
    alert("Server error ❌");
  }
};

  return (
    <div className="bg-white rounded-2xl shadow p-4">

      <h2 className="text-lg font-bold mb-4">
        Onboarding Candidates
      </h2>

      <div className="overflow-x-auto">

        <table className="w-full text-sm">

          {/* HEADER */}
          <thead>
            <tr className="grid grid-cols-7 font-semibold text-sm border-b pb-2">
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Department</th>
              <th>Role</th>
              <th>Date of Joining</th>
              <th>Action</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>

            {!Array.isArray(candidates) || candidates.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-400">
                  No Candidates
                </td>
              </tr>
            ) : (

              candidates.map((item) => (

                <tr key={item.id} className="grid grid-cols-7 py-2 border-b">

                  <td>
                    {item.first_name} {item.last_name}
                  </td>

                  <td>{item.email || "-"}</td>

                  <td>{item.phone || "-"}</td>

                  <td>{item.department || "-"}</td>

                  <td>{item.role || "-"}</td>

                  <td>
                    {item.date_of_joining || "Not Assigned"}
                  </td>

                  {/* ACTION */}
                  <td>
                    <button
                      onClick={() => approveCandidate(item.id)}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}
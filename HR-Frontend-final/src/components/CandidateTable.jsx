import { useEffect, useState } from "react";
import AddCandidateModal from "./AddCandidateModal";

const CandidateTable = () => {
  const [candidates, setCandidates] = useState([]);
  const [viewId, setViewId] = useState(null); // ✅ view state

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const isAdmin = localStorage.getItem("isAdmin");

    const url =
      isAdmin === "true"
        ? "http://127.0.0.1:8000/api/app1/employees/"
        : `http://127.0.0.1:8000/api/app1/employees/?user_id=${userId}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        console.log("API DATA:", data);
        setCandidates(data);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="bg-white rounded shadow p-4 overflow-x-auto">

      {/* HEADER */}
      <div className="grid grid-cols-8 gap-7 min-w-[1200px] font-semibold text-sm border-b pb-3">
        <div>Emp ID</div>
        <div>Name</div>
        <div>Email</div>
        <div>Phone</div>
        <div>Department</div>
        <div>Joining Date</div>
        <div>Role</div>
        
        <div>Action</div> {/* ✅ NEW */}
      </div>

      {/* DATA */}
      {candidates && candidates.length > 0 ? (
        candidates.map((c, index) => (
          <div
            key={index}
            className="grid grid-cols-8 gap-7 min-w-[1300px] text-sm border-b py-3 hover:bg-gray-50"
          >
            <div>{c.employee_id}</div>
            <div>{c.name}</div> {/* ✅ FIX */}
            <div>{c.email}</div>
            <div>{c.phone}</div>
            <div>{c.department}</div>
            <div>{c.date_of_joining}</div>
            <div>{c.role}</div>
           

            {/* ✅ VIEW BUTTON */}
            <div>
              <button
                onClick={() => setViewId(c.id)}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
              >
                View
              </button>
            </div>

          </div>
        ))
      ) : (
        <div className="flex justify-center py-10 text-gray-400">
          No records found
        </div>
      )}

      {/* ✅ OPEN FORM */}
      {viewId && (
        <AddCandidateModal
          closeModal={() => setViewId(null)}
          candidateId={viewId}
        />
      )}
    </div>
  );
};

export default CandidateTable;



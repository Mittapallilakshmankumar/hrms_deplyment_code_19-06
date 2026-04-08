import { useState, useEffect } from "react";

const Education = ({ setEducationData, initialData }) => {

  const [rows, setRows] = useState([{}]);

  // ✅ LOAD DATA FROM VIEW
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setRows(initialData);
    }
  }, [initialData]);

  const handleChange = (index, field, value) => {
    const values = [...rows];
    values[index][field] = value;
    setRows(values);

    if (setEducationData) {
      setEducationData(values);
    }
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        school: "",
        degree: "",
        field_of_study: "",
        start_date: "",
        notes: ""
      }
    ]);
  };

  const removeRow = (index) => {
    const values = [...rows];
    values.splice(index, 1);
    setRows(values);

    if (setEducationData) {
      setEducationData(values);
    }
  };

  return (
    <div className="mb-6">

      <h3 className="text-lg font-semibold mb-3">Education</h3>

      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-5 gap-3 mb-2">

          {/* School */}
          <input
            placeholder="School Name"
            value={row.school || ""}
            className="border p-2 rounded"
            onChange={(e) => handleChange(index, "school", e.target.value)}
          />

          {/* Degree */}
          <input
            placeholder="Degree / Diploma"
            value={row.degree || ""}
            className="border p-2 rounded"
            onChange={(e) => handleChange(index, "degree", e.target.value)}
          />

          {/* Field */}
          <input
            placeholder="Field of Study"
            value={row.field_of_study || ""}
            className="border p-2 rounded"
            onChange={(e) => handleChange(index, "field_of_study", e.target.value)}
          />

          {/* Date */}
          <input
            type="date"
            value={row.start_date || ""}
            className="border p-2 rounded"
            onChange={(e) => handleChange(index, "start_date", e.target.value)}
          />

          {/* Notes */}
          <div className="flex items-center gap-2">
            <input
              placeholder="Notes"
              value={row.notes || ""}
              className="border p-2 rounded w-full"
              onChange={(e) => handleChange(index, "notes", e.target.value)}
            />

            {rows.length > 1 && (
              <button
                onClick={() => removeRow(index)}
                className="text-red-500 font-bold"
              >
                ✕
              </button>
            )}
          </div>

        </div>
      ))}

      <button onClick={addRow} className="text-blue-600 font-medium">
        + Add Row
      </button>

    </div>
  );
};

export default Education;



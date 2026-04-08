import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/AppProviders";
import apiClient, { ROLES, STATUS, formatCurrency, getListData } from "../components/appCore";
import ContentCard from "../components/ContentCard";
import Layout from "../components/Layout";
import PageHero from "../components/PageHero";
import SearchToolbar from "../components/SearchToolbar";
import StatusBadge from "../components/StatusBadge";
import SummaryCard from "../components/SummaryCard";

async function listAdvances(params = {}) {
  const response = await apiClient.get("advances/", { params });
  return getListData(response.data);
}

async function listHrUsersApi(params = {}) {
  const response = await apiClient.get("auth/hr-users/", { params });
  return response.data;
}

async function listRoleAssignmentsApi(params = {}) {
  const response = await apiClient.get("auth/role-assignments/", { params });
  return response.data;
}

async function createRoleAssignmentApi(payload) {
  const response = await apiClient.post("auth/role-assignments/", payload);
  return response.data;
}

async function updateRoleAssignmentApi(assignmentId, payload) {
  const response = await apiClient.patch(`auth/role-assignments/${assignmentId}/`, payload);
  return response.data;
}

async function getAdminDashboard() {
  const response = await apiClient.get("auth/admin/dashboard/");
  return response.data;
}

async function listExpenses(params = {}) {
  const response = await apiClient.get("expenses/", { params });
  return getListData(response.data);
}

async function reviewExpense(id) {
  const response = await apiClient.post(`expenses/${id}/review/`);
  return response.data;
}

async function approveExpense(id) {
  const response = await apiClient.post(`expenses/${id}/approve/`);
  return response.data;
}

async function rejectExpense(id, rejectionReason) {
  const response = await apiClient.post(`expenses/${id}/reject/`, { rejection_reason: rejectionReason });
  return response.data;
}

async function closeExpense(id) {
  const response = await apiClient.post(`expenses/${id}/close/`);
  return response.data;
}

const initialAssignmentForm = { employee_id: "", role: ROLES.MAKER };

function sortAssignments(rows = []) {
  return [...rows].sort((left, right) => {
    const leftName = (left?.employee?.name || "").toLowerCase();
    const rightName = (right?.employee?.name || "").toLowerCase();
    if (leftName !== rightName) {
      return leftName.localeCompare(rightName);
    }
    return (left?.employee?.employee_id || "").localeCompare(right?.employee?.employee_id || "");
  });
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function MiniBarChart({ title, rows, palette = "cyan" }) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const gradients = { cyan: "from-cyan-500 to-sky-600", emerald: "from-emerald-500 to-teal-600" };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h4>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{row.label}</span>
              <span className="text-slate-500">{row.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white">
              <div className={`h-2.5 rounded-full bg-gradient-to-r ${gradients[palette]}`} style={{ width: `${Math.max((row.value / maxValue) * 100, 8)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getAssignmentOptionLabel(employee) {
  const suffix = employee.maker_checker_assignment_id ? ` (${employee.maker_checker_role}${employee.maker_checker_active ? ", active" : ", inactive"})` : "";
  return `${employee.name} • ${employee.employee_id} • ${employee.email}${suffix}`;
}

export default function AdminDashboardPage() {
  const { extractErrorMessage } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [hrUsers, setHrUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editForm, setEditForm] = useState({ role: ROLES.MAKER, is_active: true });
  const [hrSearch, setHrSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState("ALL");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState("ALL");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL");
  const [actingOnRequestId, setActingOnRequestId] = useState(null);

  const mergeAssignmentRow = useCallback((nextAssignment) => {
    if (!nextAssignment?.id) {
      return;
    }

    setAssignments((current) =>
      sortAssignments([
        ...current.filter((assignment) => assignment.id !== nextAssignment.id),
        nextAssignment,
      ])
    );
  }, []);

  const loadRoleAssignmentData = useCallback(async () => {
    const [hrUsersData, assignmentsData] = await Promise.all([
      listHrUsersApi(),
      listRoleAssignmentsApi(),
    ]);
    setHrUsers(hrUsersData);
    setAssignments(assignmentsData);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [dashboardResult, roleDataResult, expensesResult, advancesResult] = await Promise.allSettled([
      getAdminDashboard(),
      loadRoleAssignmentData(),
      listExpenses(),
      listAdvances(),
    ]);

    if (dashboardResult.status === "fulfilled") {
      setDashboard(dashboardResult.value);
    }

    if (expensesResult.status === "fulfilled") {
      setExpenses(expensesResult.value);
    }

    if (advancesResult.status === "fulfilled") {
      setAdvances(advancesResult.value);
    }

    const firstFailure = [dashboardResult, roleDataResult, expensesResult, advancesResult].find(
      (result) => result.status === "rejected"
    );

    if (firstFailure?.status === "rejected") {
      setError(extractErrorMessage(firstFailure.reason, "Unable to load the admin dashboard."));
    }

    setLoading(false);
  }, [extractErrorMessage, loadRoleAssignmentData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableHrUsers = useMemo(() => {
    const needle = hrSearch.trim().toLowerCase();
    return hrUsers.filter((employee) => !needle || [employee.name, employee.email, employee.employee_id].filter(Boolean).some((value) => value.toLowerCase().includes(needle)));
  }, [hrSearch, hrUsers]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesRole = assignmentRoleFilter === "ALL" || assignment.role === assignmentRoleFilter;
      const matchesStatus = assignmentStatusFilter === "ALL" || (assignmentStatusFilter === "ACTIVE" ? assignment.is_active : !assignment.is_active);
      const needle = assignmentSearch.trim().toLowerCase();
      const employee = assignment.employee || {};
      const matchesSearch = !needle || [employee.name, employee.email, employee.employee_id].filter(Boolean).some((value) => value.toLowerCase().includes(needle));
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [assignmentRoleFilter, assignmentSearch, assignmentStatusFilter, assignments]);

  const filteredRequests = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesStatus = requestStatusFilter === "ALL" || expense.status === requestStatusFilter;
      const needle = requestSearch.trim().toLowerCase();
      const matchesSearch = !needle || [expense.reference, expense.payable_to, expense.maker_details?.full_name, expense.maker_details?.username].filter(Boolean).some((value) => value.toLowerCase().includes(needle));
      return matchesStatus && matchesSearch;
    });
  }, [expenses, requestSearch, requestStatusFilter]);

  const activeAdvances = useMemo(() => advances.filter((advance) => advance.status !== STATUS.CLOSED).slice(0, 6), [advances]);
  const userRoleChartRows = useMemo(() => Object.entries(dashboard?.charts?.user_roles || {}).map(([label, value]) => ({ label, value })), [dashboard]);
  const requestChartRows = useMemo(() => Object.entries(dashboard?.charts?.request_statuses || {}).map(([label, value]) => ({ label: label.replaceAll("_", " "), value })), [dashboard]);

  const handleAssignRole = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!assignmentForm.employee_id) {
      setError("Select an existing HR user before assigning a Maker-Checker role.");
      setSuccess("");
      return;
    }
    try {
      setSavingAssignment(true);
      setError("");
      setSuccess("");
      const response = await createRoleAssignmentApi({
        employee_id: Number(assignmentForm.employee_id),
        role: assignmentForm.role,
      });
      setAssignmentForm(initialAssignmentForm);
      mergeAssignmentRow(response.assignment);
      setSuccess("Maker-Checker role assigned successfully.");
      await Promise.allSettled([loadRoleAssignmentData(), getAdminDashboard().then(setDashboard)]);
    } catch (apiError) {
      setError(extractErrorMessage(apiError, "Unable to assign the Maker-Checker role."));
    } finally {
      setSavingAssignment(false);
    }
  };

  const startEdit = (assignment) => {
    setEditingAssignmentId(assignment.id);
    setEditForm({ role: assignment.role, is_active: assignment.is_active });
  };

  const saveEdit = async () => {
    try {
      setSavingAssignment(true);
      setError("");
      setSuccess("");
      const response = await updateRoleAssignmentApi(editingAssignmentId, editForm);
      setEditingAssignmentId(null);
      mergeAssignmentRow(response.assignment);
      setSuccess("Maker-Checker role assignment updated successfully.");
      await Promise.allSettled([loadRoleAssignmentData(), getAdminDashboard().then(setDashboard)]);
    } catch (apiError) {
      setError(extractErrorMessage(apiError, "Unable to update the role assignment."));
    } finally {
      setSavingAssignment(false);
    }
  };

  const toggleAssignmentAccess = async (assignment, nextIsActive) => {
    if (!assignment || assignment.is_active === nextIsActive) {
      return;
    }

    const employeeName = assignment?.employee?.name || assignment?.user?.full_name || assignment?.user?.username || "this employee";
    const actionLabel = nextIsActive ? "add" : "remove";
    const confirmed = window.confirm(
      nextIsActive
        ? `Add Maker-Checker access for ${employeeName}? This will only reactivate the existing role assignment and will not modify the HR employee record.`
        : `Remove Maker-Checker access for ${employeeName}? This will only deactivate the role assignment and will not delete the HR employee record.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingAssignment(true);
      setError("");
      setSuccess("");
      const response = await updateRoleAssignmentApi(assignment.id, { is_active: nextIsActive });
      mergeAssignmentRow(response.assignment);
      setSuccess(`Maker-Checker access ${actionLabel === "add" ? "added" : "removed"} successfully.`);
      await Promise.allSettled([loadRoleAssignmentData(), getAdminDashboard().then(setDashboard)]);
    } catch (apiError) {
      setError(
        extractErrorMessage(
          apiError,
          `Unable to ${actionLabel} Maker-Checker access.`
        )
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const runRequestAction = async (expense, action) => {
    try {
      setActingOnRequestId(expense.id);
      setError("");
      setSuccess("");
      if (action === "review") await reviewExpense(expense.id);
      else if (action === "approve") await approveExpense(expense.id);
      else if (action === "close") await closeExpense(expense.id);
      else if (action === "reject") {
        const reason = window.prompt(`Enter a rejection reason for ${expense.reference}:`, "Please review and resubmit with the correct details.");
        if (!reason) return;
        await rejectExpense(expense.id, reason);
      }
      setSuccess(`Request ${expense.reference} updated successfully.`);
      await loadData();
    } catch (apiError) {
      setError(extractErrorMessage(apiError, "Unable to process the request."));
    } finally {
      setActingOnRequestId(null);
    }
  };

  const requestAction = (expense) => {
    if (expense.status === STATUS.SUBMITTED) return { label: "Review", run: () => runRequestAction(expense, "review") };
    if (expense.status === STATUS.REVIEWED) return { label: "Approve", run: () => runRequestAction(expense, "approve") };
    if (expense.status === STATUS.BILL_SUBMITTED) return { label: "Close", run: () => runRequestAction(expense, "close") };
    return null;
  };

  return (
    <Layout
      headerContent={
        <button type="button" onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          Refresh Admin Data
        </button>
      }
    >
      <div className="space-y-6">
        <PageHero
          title="Admin Dashboard"
          subtitle="Assign Maker-Checker roles to existing HR users, supervise requests, and keep HR identity data read-only."
          badge="HR-linked Access Control"
          badgeColor="emerald"
          actions={
            <Link to="/admin/reports" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Open Reports
            </Link>
          }
        />

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        ) : null}

        {loading && !dashboard ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500 shadow-sm">Loading admin dashboard...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard title="Assigned Users" value={dashboard?.summary?.total_users || 0} />
              <SummaryCard title="Active Access" value={dashboard?.summary?.active_users || 0} />
              <SummaryCard title="Open Requests" value={dashboard?.summary?.open_requests || 0} />
              <SummaryCard title="Active Advances" value={dashboard?.summary?.active_advances || 0} />
              <SummaryCard title="Remaining Balance" value={formatCurrency(dashboard?.summary?.remaining_balance)} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <MiniBarChart title="Assigned Roles" rows={userRoleChartRows} palette="emerald" />
              <MiniBarChart title="Requests by Status" rows={requestChartRows} />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Access Snapshot</h4>
                <div className="mt-5 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3"><span>Makers</span><strong>{dashboard?.summary?.makers || 0}</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3"><span>Checkers</span><strong>{dashboard?.summary?.checkers || 0}</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3"><span>Admins</span><strong>{dashboard?.summary?.admins || 0}</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3"><span>Inactive Mappings</span><strong>{dashboard?.summary?.inactive_users || 0}</strong></div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <ContentCard title="Assign Existing HR User">
              <form className="space-y-4" onSubmit={handleAssignRole} noValidate>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Search HR User</label>
                  <input type="text" value={hrSearch} onChange={(event) => setHrSearch(event.target.value)} placeholder="Search by name, employee ID, or email" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Existing HR User</label>
                  <select value={assignmentForm.employee_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, employee_id: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900">
                    <option value="">Select an HR user</option>
                    {availableHrUsers.map((employee) => (
                      <option key={employee.id} value={employee.id}>{getAssignmentOptionLabel(employee)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Maker-Checker Role</label>
                  <select value={assignmentForm.role} onChange={(event) => setAssignmentForm((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900">
                    <option value={ROLES.MAKER}>Maker</option>
                    <option value={ROLES.CHECKER}>Checker</option>
                    <option value={ROLES.ADMIN}>Admin</option>
                  </select>
                </div>
                <button type="submit" disabled={savingAssignment} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {savingAssignment ? "Assigning Role..." : "Assign Maker-Checker Role"}
                </button>
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  HR remains the source of truth for identity and password. This action only creates or updates Maker-Checker access mapping.
                </p>
              </form>
            </ContentCard>
          </div>

          <div className="xl:col-span-3">
            <ContentCard title="Operations Snapshot">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-800">Recent Requests</p>
                  <div className="mt-4 space-y-3">
                    {(dashboard?.recent_requests || []).map((request) => (
                      <div key={request.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-800">{request.reference}</p>
                            <p className="text-xs text-slate-500">{request.maker_name}</p>
                          </div>
                          <StatusBadge status={request.status} />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{formatCurrency(request.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-800">Advance Oversight</p>
                  <div className="mt-4 space-y-3">
                    {activeAdvances.map((advance) => (
                      <div key={advance.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-800">{advance.reference}</p>
                            <p className="text-xs text-slate-500">{advance.maker_details?.full_name || advance.maker_details?.username}</p>
                          </div>
                          <StatusBadge status={advance.status} />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">Balance {formatCurrency(advance.balance_amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ContentCard>
          </div>
        </div>

        <ContentCard title="Assigned Maker-Checker Users">
          <div className="space-y-5">
            <SearchToolbar
              title="Role Assignments"
              subtitle="Search existing HR-linked Maker-Checker access, update roles, and activate or deactivate mappings safely."
              search={assignmentSearch}
              setSearch={setAssignmentSearch}
              placeholder="Search by employee name, employee ID, or email"
            />

            <div className="flex flex-wrap gap-3">
              <FilterPill active={assignmentRoleFilter === "ALL"} onClick={() => setAssignmentRoleFilter("ALL")}>All Roles</FilterPill>
              <FilterPill active={assignmentRoleFilter === ROLES.MAKER} onClick={() => setAssignmentRoleFilter(ROLES.MAKER)}>Makers</FilterPill>
              <FilterPill active={assignmentRoleFilter === ROLES.CHECKER} onClick={() => setAssignmentRoleFilter(ROLES.CHECKER)}>Checkers</FilterPill>
              <FilterPill active={assignmentRoleFilter === ROLES.ADMIN} onClick={() => setAssignmentRoleFilter(ROLES.ADMIN)}>Admins</FilterPill>
              <FilterPill active={assignmentStatusFilter === "ALL"} onClick={() => setAssignmentStatusFilter("ALL")}>All Statuses</FilterPill>
              <FilterPill active={assignmentStatusFilter === "ACTIVE"} onClick={() => setAssignmentStatusFilter("ACTIVE")}>Active</FilterPill>
              <FilterPill active={assignmentStatusFilter === "INACTIVE"} onClick={() => setAssignmentStatusFilter("INACTIVE")}>Inactive</FilterPill>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">HR User</th>
                    <th className="px-5 py-4 font-semibold">Employee ID</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Maker-Checker Role</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length ? filteredAssignments.map((assignment) => {
                    const employee = assignment.employee || {};
                    const user = assignment.user || {};
                    const displayName = employee.name || user.full_name || user.username || "-";
                    const displayDepartment = employee.department || "-";
                    const displayEmployeeId = employee.employee_id || user.employee_id || user.username || "-";
                    const displayEmail = employee.email || user.email || "-";
                    const isEditing = editingAssignmentId === assignment.id;
                    return (
                      <tr key={assignment.id} className="border-t border-slate-200 align-top">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{displayName}</p>
                          <p className="text-xs text-slate-500">{displayDepartment}</p>
                        </td>
                        <td className="px-5 py-4">{displayEmployeeId}</td>
                        <td className="px-5 py-4">{displayEmail}</td>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2">
                              <option value={ROLES.MAKER}>Maker</option>
                              <option value={ROLES.CHECKER}>Checker</option>
                              <option value={ROLES.ADMIN}>Admin</option>
                            </select>
                          ) : (
                            assignment.role
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${assignment.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {assignment.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                              <>
                                <button type="button" onClick={saveEdit} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Save</button>
                                <button type="button" onClick={() => setEditingAssignmentId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => startEdit(assignment)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Edit Role</button>
                                {assignment.is_active ? (
                                  <button type="button" onClick={() => toggleAssignmentAccess(assignment, false)} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700">
                                    Remove
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => toggleAssignmentAccess(assignment, true)} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700">
                                    Add
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className="border-t border-slate-200">
                      <td colSpan="6" className="px-5 py-8 text-center text-sm text-slate-500">
                        No Maker-Checker role assignments found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ContentCard>

        <ContentCard title="View All Requests">
          <div className="space-y-5">
            <SearchToolbar
              title="Request Control"
              subtitle="Search all requests, filter by workflow stage, and approve, reject, review, or close where needed."
              search={requestSearch}
              setSearch={setRequestSearch}
              placeholder="Search by request, maker, or payable to"
            />

            <div className="flex flex-wrap gap-3">
              {["ALL", STATUS.SUBMITTED, STATUS.REVIEWED, STATUS.APPROVED, STATUS.BILL_SUBMITTED, STATUS.CLOSED, STATUS.REJECTED].map((status) => (
                <FilterPill key={status} active={requestStatusFilter === status} onClick={() => setRequestStatusFilter(status)}>
                  {status === "ALL" ? "All Requests" : status.replaceAll("_", " ")}
                </FilterPill>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Request</th>
                    <th className="px-5 py-4 font-semibold">Maker</th>
                    <th className="px-5 py-4 font-semibold">Amount</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Reviewer / Approver</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((expense) => {
                    const primaryAction = requestAction(expense);
                    return (
                      <tr key={expense.id} className="border-t border-slate-200">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-slate-800">{expense.reference}</p>
                            <p className="text-xs text-slate-500">{expense.payable_to}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">{expense.maker_details?.full_name || expense.maker_details?.username}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{formatCurrency(expense.amount)}</td>
                        <td className="px-5 py-4"><StatusBadge status={expense.status} /></td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <p>Reviewer: {expense.reviewed_by_details?.full_name || expense.reviewed_by_details?.username || "-"}</p>
                          <p className="mt-1">Approver: {expense.approved_by_details?.full_name || expense.approved_by_details?.username || "-"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/admin/expenses/${expense.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">View</Link>
                            {primaryAction ? (
                              <button type="button" disabled={actingOnRequestId === expense.id} onClick={primaryAction.run} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{primaryAction.label}</button>
                            ) : null}
                            {[STATUS.SUBMITTED, STATUS.REVIEWED].includes(expense.status) ? (
                              <button type="button" disabled={actingOnRequestId === expense.id} onClick={() => runRequestAction(expense, "reject")} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60">Reject</button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ContentCard>
      </div>
    </Layout>
  );
}

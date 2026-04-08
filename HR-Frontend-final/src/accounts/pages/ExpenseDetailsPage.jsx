import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth, useLoading } from "../components/AppProviders";
import apiClient, {
  ROLES,
  STATUS,
  buildAbsoluteUrl,
  emitDashboardRefresh,
  formatCurrency,
} from "../components/appCore";
import ContentCard from "../components/ContentCard";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";

async function getAdvanceLedger(id) {
  const response = await apiClient.get(`advances/${id}/ledger/`);
  return response.data;
}

async function getExpense(id) {
  const response = await apiClient.get(`expenses/${id}/`);
  return response.data;
}

async function submitExpense(id) {
  const response = await apiClient.post(`expenses/${id}/submit/`);
  return response.data;
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
  const response = await apiClient.post(`expenses/${id}/reject/`, {
    rejection_reason: rejectionReason,
  });
  return response.data;
}

async function closeExpense(id) {
  const response = await apiClient.post(`expenses/${id}/close/`);
  return response.data;
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-800">{value || "-"}</p>
    </div>
  );
}

function TimelineStep({ title, subtitle, active = false, done = false, last = false }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
            done
              ? "bg-blue-500 text-white"
              : active
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {done ? "✓" : "•"}
        </div>
        {!last ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
      </div>

      <div className="pb-6">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function getTimeline(status) {
  const steps = [
    { key: "draft", title: "Expense Drafted", subtitle: "Maker prepared the expense entry" },
    { key: "submitted", title: "Submitted", subtitle: "Expense sent for checker review" },
    { key: "reviewed", title: "Reviewed", subtitle: "Checker completed review stage" },
    { key: "approved", title: "Approved", subtitle: "Checker approved the expense" },
    { key: "bill", title: "Bill Submitted", subtitle: "Maker uploaded the bill against the approved expense" },
    { key: "closed", title: "Closed", subtitle: "Final bill verification completed" },
  ];

  const order = {
    DRAFT: 0,
    SUBMITTED: 1,
    REVIEWED: 2,
    APPROVED: 3,
    BILL_SUBMITTED: 4,
    CLOSED: 5,
    REJECTED: 1,
  };

  const currentIndex = order[status] ?? 0;
  const lastIndex = steps.length - 1;
  const activeIndex =
    status === STATUS.REJECTED || currentIndex === lastIndex
      ? currentIndex
      : currentIndex + 1;

  return steps.map((step, index) => ({
    ...step,
    done: index <= currentIndex,
    active: index === activeIndex && index > currentIndex,
  }));
}

function getBillUrl(expense) {
  if (expense?.bill_file_url) {
    return expense.bill_file_url;
  }

  if (!expense?.bill_file) {
    return "";
  }

  return buildAbsoluteUrl(expense.bill_file);
}

function getPaymentReferenceLabel(paymentMode) {
  if (paymentMode === "UPI") {
    return "UTR / TR ID";
  }

  if (paymentMode === "Bank Transfer") {
    return "Bank Reference Number";
  }

  if (paymentMode === "Other") {
    return "Payment Details";
  }

  return "Payment Reference";
}

export default function ExpenseDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const { role, user, extractErrorMessage } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  const [expense, setExpense] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(location.state?.successMessage || "");
  const [notFound, setNotFound] = useState(false);

  const loadExpense = useCallback(async () => {
    const nextExpense = await getExpense(id);
    setExpense(nextExpense);
    if (nextExpense.advance) {
      const ledger = await getAdvanceLedger(nextExpense.advance);
      setLedgerEntries(ledger);
    }
  }, [id]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);
        await loadExpense();
      } catch (apiError) {
        if (apiError?.response?.status === 404) {
          setExpense(null);
          setNotFound(true);
        } else {
          setError(extractErrorMessage(apiError, "Unable to load expense details."));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [extractErrorMessage, loadExpense, setGlobalLoading]);

  const timeline = useMemo(
    () => getTimeline(expense?.status),
    [expense?.status]
  );

  const advance = expense?.advance_details;
  const isReviewerReject = expense?.status === STATUS.SUBMITTED;
  const rejectRoleLabel = isReviewerReject ? "Reviewer" : "Approver";
  const isAssignedReviewer = user?.id === expense?.reviewed_by;
  const isAssignedApprover = user?.id === expense?.approved_by;
  const paymentReferenceLabel = getPaymentReferenceLabel(expense?.payment_mode);
  const backPath =
    role === ROLES.ADMIN
      ? "/admin/dashboard"
      : role === ROLES.CHECKER
      ? expense?.status === STATUS.REVIEWED
        ? "/pending-approval"
        : expense?.status === STATUS.BILL_SUBMITTED
        ? "/final-bill-verification"
        : "/pending-verification"
      : "/my-expenses";

  const handleAction = async (action, payload = {}) => {
    try {
      setActionLoading(true);
      setGlobalLoading(true);
      setError("");
      setSuccess("");

      if (action === "submit") {
        await submitExpense(id);
        setSuccess("Expense submitted for checker review.");
      }
      if (action === "review") {
        await reviewExpense(id);
        setSuccess("Expense reviewed successfully.");
      }
      if (action === "approve") {
        await approveExpense(id);
        setSuccess("Expense approved successfully.");
      }
      if (action === "reject") {
        const trimmedReason = payload.rejectionReason?.trim() || "";
        if (!trimmedReason) {
          setError("Rejection message is required.");
          return;
        }
        await rejectExpense(id, trimmedReason);
        setSuccess("Expense rejected successfully.");
        setShowRejectDialog(false);
        setRejectionMessage("");
      }
      if (action === "close") {
        await closeExpense(id);
        setSuccess("Expense closed successfully.");
      }

      await loadExpense();
      emitDashboardRefresh({ source: `expense-${action}`, expenseId: Number(id) });
    } catch (apiError) {
      setError(extractErrorMessage(apiError, "Unable to update expense."));
    } finally {
      setActionLoading(false);
      setGlobalLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
          Loading expense details...
        </div>
      </Layout>
    );
  }

  if (notFound || !expense) {
    return (
      <Layout>
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-2xl font-semibold text-slate-800">
            Expense not found
          </h2>
          <Link
            to={backPath}
            className="mt-6 inline-block rounded-md bg-blue-500 px-5 py-3 text-sm font-medium text-white hover:bg-blue-600"
          >
            Back to Expenses
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                to={backPath}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                ← Back
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-slate-900">{expense.reference}</h1>
                <StatusBadge status={expense.status} />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                View the linked advance, live balance context, checker assignments, and full expense workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {expense.bill_file_available ? (
                <a
                  href={getBillUrl(expense)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  View Bill
                </a>
              ) : null}

              {role === ROLES.MAKER && expense.status === STATUS.DRAFT ? (
                <button
                  type="button"
                  onClick={() => handleAction("submit")}
                  disabled={actionLoading}
                  className="inline-flex min-w-[112px] items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Submitting..." : "Submit"}
                </button>
              ) : null}

              {role === ROLES.MAKER && expense.status === STATUS.APPROVED ? (
                <Link
                  to="/upload-bill"
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Upload Bill
                </Link>
              ) : null}

              {role === ROLES.CHECKER && expense.status === STATUS.SUBMITTED && isAssignedReviewer ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAction("review")}
                    disabled={actionLoading}
                    className="inline-flex min-w-[112px] items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? "Updating..." : "Review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionLoading}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </>
              ) : null}

              {role === ROLES.CHECKER && expense.status === STATUS.REVIEWED && isAssignedApprover ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading}
                    className="inline-flex min-w-[112px] items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? "Updating..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionLoading}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </>
              ) : null}

              {role === ROLES.CHECKER && expense.status === STATUS.BILL_SUBMITTED && isAssignedReviewer ? (
                <button
                  type="button"
                  onClick={() => handleAction("close")}
                  disabled={actionLoading}
                  className="inline-flex min-w-[132px] items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Closing..." : "Close Expense"}
                </button>
              ) : null}
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <ContentCard title="Expense Details">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Expense ID" value={expense.reference} />
                <Field label="Created At" value={expense.created_at?.slice(0, 10)} />
                <Field label="Expense Date" value={expense.expense_date} />
                <Field label="Maker" value={expense.maker_details?.full_name} />
                <Field label="Payable To" value={expense.payable_to} />
                <Field label="Amount" value={formatCurrency(expense.amount)} />
                <Field label="Amount In Words" value={expense.amount_in_words} />
                <Field label="Category" value={expense.category} />
                <Field label="Payment Mode" value={expense.payment_mode} />
                <Field label={paymentReferenceLabel} value={expense.transaction_reference} />
                <Field
                  label="Bill File"
                  value={expense.bill_file_name || "-"}
                />
                <Field label="Reviewed By" value={expense.reviewed_by_details?.full_name} />
                <Field label="Approved By" value={expense.approved_by_details?.full_name} />
                <div className="md:col-span-2">
                  <Field label="Purpose" value={expense.purpose} />
                </div>
                <div className="md:col-span-2">
                  <Field label="Remarks" value={expense.remarks} />
                </div>
                {expense.rejection_reason ? (
                  <div className="md:col-span-2">
                    <Field label="Rejection Message" value={expense.rejection_reason} />
                  </div>
                ) : null}
              </div>
            </ContentCard>

            */}
          </div>

          <div className="space-y-6">
            <ContentCard title="Timeline">
              <div>
                {timeline.map((step, index) => (
                  <TimelineStep
                    key={step.key}
                    title={step.title}
                    subtitle={step.subtitle}
                    active={step.active}
                    done={step.done}
                    last={index === timeline.length - 1}
                  />
                ))}
              </div>
            </ContentCard>

            <ContentCard title="Quick Summary">
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Current Status</p>
                  <div className="mt-2">
                    <StatusBadge status={expense.status} />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Advance Remarks</p>
                  <p className="mt-2 text-sm text-slate-800">{advance?.remarks || "-"}</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Allocated By</p>
                  <p className="mt-2 text-sm text-slate-800">{advance?.allocated_by_details?.full_name || "-"}</p>
                </div>
              </div>
            </ContentCard>
          </div>
        </div>

        {showRejectDialog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
            <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-800">Reject Expense</h3>
              <p className="mt-2 text-sm text-slate-500">
                {rejectRoleLabel} rejection requires a message so the maker can understand why this expense was rejected.
              </p>

              <textarea
                rows={5}
                value={rejectionMessage}
                onChange={(event) => setRejectionMessage(event.target.value)}
                placeholder={`Enter ${rejectRoleLabel.toLowerCase()} rejection message`}
                className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
              />

              {!rejectionMessage.trim() ? (
                <p className="mt-2 text-sm text-red-600">Rejection message is required.</p>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionMessage("");
                  }}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAction("reject", { rejectionReason: rejectionMessage })
                  }
                  disabled={actionLoading || !rejectionMessage.trim()}
                  className="inline-flex min-w-[132px] items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

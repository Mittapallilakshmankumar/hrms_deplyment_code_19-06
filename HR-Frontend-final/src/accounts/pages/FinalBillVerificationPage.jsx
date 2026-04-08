import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/AppProviders";
import apiClient, {
  STATUS,
  buildAbsoluteUrl,
  emitDashboardRefresh,
  formatCurrency,
  getListData,
} from "../components/appCore";
import ContentCard from "../components/ContentCard";
import Layout from "../components/Layout";
import PageHero from "../components/PageHero";
import StatusBadge from "../components/StatusBadge";
import SummaryCard from "../components/SummaryCard";

async function listAdvances(params = {}) {
  const response = await apiClient.get("advances/", { params });
  return getListData(response.data);
}

async function listExpenses(params = {}) {
  const response = await apiClient.get("expenses/", { params });
  return getListData(response.data);
}

async function closeExpense(id) {
  const response = await apiClient.post(`expenses/${id}/close/`);
  return response.data;
}

function VerificationGuide() {
  return (
    <ContentCard title="Final Verification Actions">
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Reviewer Verifies Bill</h4>
          <p className="mt-1 text-sm text-slate-500">
            Confirm that the uploaded bill matches the approved expense and the linked advance usage before closing the workflow.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Bill Return Handling</h4>
          <p className="mt-1 text-sm text-slate-500">
            Only the assigned reviewer can close this stage. Use earlier review or approval steps for corrections and returns.
          </p>
        </div>
      </div>
    </ContentCard>
  );
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

function getBillPreviewType(path = "") {
  const normalizedPath = String(path).toLowerCase();

  if (normalizedPath.endsWith(".pdf")) {
    return "pdf";
  }

  if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(normalizedPath)) {
    return "image";
  }

  return "other";
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

function BillPreviewPanel({ expense, onClose }) {
  if (!expense?.bill_file) {
    return (
      <ContentCard title="Bill Preview">
        <p className="text-sm text-slate-500">
          Choose a bill from the list to preview it here.
        </p>
      </ContentCard>
    );
  }

  const billUrl = getBillUrl(expense);
  const previewType = getBillPreviewType(expense.bill_file);

  return (
    <ContentCard
      title="Bill Preview"
      rightContent={
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Close Preview
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Expense</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{expense.reference}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">Bill File</p>
          <p className="mt-1 break-all text-sm text-slate-800">{expense.bill_file}</p>
        </div>

        {!expense.bill_file_available ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            The stored bill path no longer points to an available file. Re-upload or verify the media storage path.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {previewType === "image" ? (
            <img
              src={billUrl}
              alt={`Bill preview for ${expense.reference}`}
              className="max-h-[720px] w-full object-contain bg-white"
            />
            ) : previewType === "pdf" ? (
            <iframe
              title={`Bill preview for ${expense.reference}`}
              src={billUrl}
              className="h-[720px] w-full bg-white"
            />
            ) : (
            <div className="p-6 text-sm text-slate-600">
              Preview is not available for this file type in-page.
              <a
                href={billUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 font-medium text-blue-600 hover:text-blue-700"
              >
                Open file
              </a>
            </div>
            )}
          </div>
        )}
      </div>
    </ContentCard>
  );
}

function VerificationRow({ item, advance, onAction, onViewBill, loadingAction }) {
  const paymentReferenceLabel = getPaymentReferenceLabel(item.payment_mode);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">{item.reference}</h3>
            <StatusBadge status={item.status} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Linked Advance</p>
              <p className="mt-1 text-sm text-slate-800">{item.advance_details?.reference}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Maker</p>
              <p className="mt-1 text-sm text-slate-800">{item.maker_details?.full_name}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Amount</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatCurrency(item.amount)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Bill File</p>
              <p className="mt-1 text-sm text-slate-800">{item.bill_file || "-"}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Total Advance</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {formatCurrency(advance?.total_amount)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Total Spent</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {formatCurrency(advance?.spent_amount)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Remaining Balance</p>
              <p className="mt-2 text-sm font-semibold text-blue-600">
                {formatCurrency(advance?.balance_amount)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Reviewed By</p>
                <p className="mt-1 text-sm text-slate-800">{item.reviewed_by_details?.full_name}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Approved By</p>
                <p className="mt-1 text-sm text-slate-800">{item.approved_by_details?.full_name}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Created At</p>
                <p className="mt-1 text-sm text-slate-800">{item.created_at?.slice(0, 10)}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">{paymentReferenceLabel}</p>
                <p className="mt-1 text-sm text-slate-800">{item.transaction_reference || "-"}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onViewBill(item)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View Bill
              </button>
              <button
                type="button"
                onClick={() => onAction(item.id, "close")}
                disabled={loadingAction}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingAction ? "Closing..." : "Verify Bill"}
              </button>
              <button
                type="button"
                disabled
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Return Not Supported
              </button>
            </div>
          </div>
        </div>

        <div className="w-full xl:w-[180px]">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Payable To</p>
            <p className="mt-1 text-sm text-slate-800">{item.payable_to}</p>

            <p className="mt-4 text-xs font-medium text-slate-500">Payment Mode</p>
            <p className="mt-1 text-sm text-slate-800">{item.payment_mode}</p>

            <Link
              to={`/expenses/${item.id}`}
              className="mt-4 inline-block rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinalBillVerificationPage() {
  const { extractErrorMessage } = useAuth();
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewExpense, setPreviewExpense] = useState(null);

  const loadData = async () => {
    const [expenseData, advanceData] = await Promise.all([
      listExpenses({ status: STATUS.BILL_SUBMITTED }),
      listAdvances(),
    ]);
    setExpenses(expenseData);
    setAdvances(advanceData);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        await loadData();
      } catch (apiError) {
        setError(extractErrorMessage(apiError, "Unable to load final verification queue."));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [extractErrorMessage]);

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;

    const query = search.toLowerCase();
    return expenses.filter(
      (item) =>
        item.reference.toLowerCase().includes(query) ||
        item.advance_details?.reference?.toLowerCase().includes(query) ||
        item.payable_to.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [expenses, search]);

  const handleAction = async (expenseId) => {
    try {
      setActionId(expenseId);
      setError("");
      setSuccess("");
      await closeExpense(expenseId);
      setSuccess("Expense verified and closed successfully.");
      await loadData();
      emitDashboardRefresh({ source: "expense-closed", expenseId });
    } catch (apiError) {
      setError(extractErrorMessage(apiError, "Unable to update final bill status."));
    } finally {
      setActionId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHero
          title="Final Bill Verification"
          subtitle="Verify uploaded bills and close the expense after final validation."
          badge="Checker Final Stage"
          badgeColor="cyan"
        />

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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard title="Bills Submitted" value={expenses.length} />
          <SummaryCard title="Pending Final Verification" value={filteredExpenses.length} />
          <SummaryCard title="Ready to Close" value={filteredExpenses.length} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Bills Waiting for Verification
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing {filteredExpenses.length} expense(s).
                  </p>
                </div>

                <div className="w-full xl:w-[320px]">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by expense ID, advance ID, payable to, or category"
                    className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500">
                Loading bill verification queue...
              </div>
            ) : filteredExpenses.length ? (
              filteredExpenses.map((item) => (
                <VerificationRow
                  key={item.id}
                  item={item}
                  advance={advances.find((advance) => advance.id === item.advance)}
                  onAction={handleAction}
                  onViewBill={setPreviewExpense}
                  loadingAction={actionId === item.id}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <h4 className="text-lg font-semibold text-slate-700">No bills found</h4>
                <p className="mt-2 text-sm text-slate-500">
                  Bill-submitted expenses assigned to you will appear here for final reviewer action.
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="space-y-6">
              <BillPreviewPanel
                expense={previewExpense}
                onClose={() => setPreviewExpense(null)}
              />
              <VerificationGuide />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

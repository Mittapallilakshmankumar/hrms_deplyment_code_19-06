import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useLoading } from "../components/AppProviders";
import apiClient, {
  DEFAULT_MAX_BILL_UPLOAD_BYTES,
  STATUS,
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

async function getAppConfigApi() {
  const response = await apiClient.get("auth/app-config/");
  return response.data;
}

async function listExpenses(params = {}) {
  const response = await apiClient.get("expenses/", { params });
  return getListData(response.data);
}

async function uploadBill(id, payload) {
  const formData = new FormData();
  formData.append("bill_file", payload.billFile);
  formData.append("payment_mode", payload.paymentMode);

  if (payload.transactionReference) {
    formData.append("transaction_reference", payload.transactionReference);
  }

  if (payload.paymentDetails) {
    formData.append("payment_details", payload.paymentDetails);
  }

  const response = await apiClient.post(`expenses/${id}/upload-bill/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

function formatMegabytes(bytes) {
  return Math.max(1, Math.round(Number(bytes || 0) / (1024 * 1024)));
}

function UploadGuide({ maxBillUploadSize }) {
  return (
    <ContentCard title="Bill Upload Rules">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-800">Eligible Expenses</h4>
          <p className="mt-1 text-sm text-gray-500">
            Only approved expenses are shown here for bill upload.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-800">Keep Balance Visible</h4>
          <p className="mt-1 text-sm text-gray-500">
            Review the linked advance balance before attaching the bill.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-800">Accepted Formats</h4>
          <p className="mt-1 text-sm text-gray-500">
            PDF, JPG, JPEG, and PNG with clear invoice details, up to{" "}
            {formatMegabytes(maxBillUploadSize)} MB.
          </p>
        </div>
      </div>
    </ContentCard>
  );
}

function UploadRow({ item, advance, onUpload, loading, maxBillUploadSize }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [localSuccess, setLocalSuccess] = useState("");
  const [localError, setLocalError] = useState("");

  const [paymentMode, setPaymentMode] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const isUpiPayment = paymentMode === "UPI";
  const isOtherPayment = paymentMode === "Other";
  const isBankTransfer = paymentMode === "Bank Transfer";

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    const maxBytes = Number(maxBillUploadSize || DEFAULT_MAX_BILL_UPLOAD_BYTES);

    if (!nextFile) {
      setSelectedFile(null);
      setLocalError("");
      setLocalSuccess("");
      return;
    }

    if (!allowedTypes.includes(nextFile.type)) {
      setSelectedFile(null);
      setLocalSuccess("");
      setLocalError("Select a PDF, PNG, or JPG file.");
      event.target.value = "";
      return;
    }

    if (nextFile.size > maxBytes) {
      setSelectedFile(null);
      setLocalSuccess("");
      setLocalError(`File size must be ${formatMegabytes(maxBytes)} MB or less.`);
      event.target.value = "";
      return;
    }

    setSelectedFile(nextFile);
    setLocalError("");
    setLocalSuccess("");
  };
  const validateUploadForm = () => {
    const nextErrors = {};

    if (!paymentMode) {
      nextErrors.paymentMode = "Mode of Payment is required.";
    }

    if (isUpiPayment && !transactionReference.trim()) {
      nextErrors.transactionReference = "UTR / Transaction ID is required for UPI.";
    }

    if (isBankTransfer && !transactionReference.trim()) {
      nextErrors.transactionReference = "Bank reference number is required.";
    }

    if (isOtherPayment && !paymentDetails.trim()) {
      nextErrors.paymentDetails = "Payment details are required.";
    }

    if (!selectedFile) {
      nextErrors.billFile = "Please upload the bill file.";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">{item.reference}</h3>
            <StatusBadge status={item.status} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-gray-500">Linked Advance</p>
              <p className="mt-1 text-sm text-gray-800">{item.advance_details?.reference}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">Payable To</p>
              <p className="mt-1 text-sm text-gray-800">{item.payable_to}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">Amount</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {formatCurrency(item.amount)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">Category</p>
              <p className="mt-1 text-sm text-gray-800">{item.category}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Total Advance</p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {formatCurrency(advance?.total_amount)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Total Spent</p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {formatCurrency(advance?.spent_amount)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Remaining Balance</p>
              <p className="mt-2 text-sm font-semibold text-blue-600">
                {formatCurrency(advance?.balance_amount)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5">
            <p className="text-sm font-medium text-gray-700">Upload bill / receipt</p>
            <p className="mt-1 text-xs text-gray-500">
              Attach the final bill for checker verification and expense closure.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Mode of Payment <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setPaymentMode(nextValue);
                    setTransactionReference("");
                    setPaymentDetails("");
                    setFieldErrors((prev) => ({
                      ...prev,
                      paymentMode: "",
                      transactionReference: "",
                      paymentDetails: "",
                    }));
                  }}
                  className={`w-full rounded-lg bg-white px-4 py-3 text-sm text-gray-800 outline-none transition ${fieldErrors.paymentMode
                    ? "border border-red-300 focus:border-red-500"
                    : "border border-gray-300 focus:border-blue-900"
                    }`}
                >
                  <option value="">Select payment mode</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors.paymentMode ? (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.paymentMode}</p>
                ) : null}
              </div>

              {(isUpiPayment || isBankTransfer) ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {isUpiPayment ? "Transaction / UTR ID" : "Bank Reference Number"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(event) => {
                      setTransactionReference(event.target.value);
                      setFieldErrors((prev) => ({ ...prev, transactionReference: "" }));
                    }}
                    placeholder={
                      isUpiPayment ? "Enter UTR / Transaction ID" : "Enter bank reference number"
                    }
                    className={`w-full rounded-lg bg-white px-4 py-3 text-sm text-gray-800 outline-none transition ${fieldErrors.transactionReference
                      ? "border border-red-300 focus:border-red-500"
                      : "border border-gray-300 focus:border-blue-900"
                      }`}
                  />
                  {fieldErrors.transactionReference ? (
                    <p className="mt-2 text-sm text-red-600">
                      {fieldErrors.transactionReference}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isOtherPayment ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Payment Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={paymentDetails}
                    onChange={(event) => {
                      setPaymentDetails(event.target.value);
                      setFieldErrors((prev) => ({ ...prev, paymentDetails: "" }));
                    }}
                    placeholder="Enter payment details"
                    className={`w-full rounded-lg bg-white px-4 py-3 text-sm text-gray-800 outline-none transition ${fieldErrors.paymentDetails
                      ? "border border-red-300 focus:border-red-500"
                      : "border border-gray-300 focus:border-blue-900"
                      }`}
                  />
                  {fieldErrors.paymentDetails ? (
                    <p className="mt-2 text-sm text-red-600">{fieldErrors.paymentDetails}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700"
              />
              <button
                type="button"
                disabled={!selectedFile || loading}
                onClick={async () => {
                  if (!validateUploadForm()) {
                    setLocalSuccess("");
                    return;
                  }

                  const uploaded = await onUpload(item.id, {
                    billFile: selectedFile,
                    paymentMode,
                    transactionReference,
                    paymentDetails,
                  });

                  if (uploaded) {
                    setLocalSuccess("Bill uploaded successfully");
                    setLocalError("");
                    setSelectedFile(null);
                    setPaymentMode("");
                    setTransactionReference("");
                    setPaymentDetails("");
                    setFieldErrors({});
                  }
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${selectedFile
                  ? "bg-blue-900 text-white hover:bg-blue-800 hover:shadow-md"
                  : "border border-gray-300 bg-gray-100 text-gray-500"
                  }`}
              >
                {loading ? "Uploading..." : selectedFile ? "Upload Bill" : "Choose Bill First"}
              </button>
            </div>
            {selectedFile ? (
              <p className="mt-3 text-sm text-gray-600">Selected file: {selectedFile.name}</p>
            ) : null}
            {localError ? (
              <p className="mt-2 text-sm text-rose-600">{localError}</p>
            ) : null}
            {fieldErrors.billFile ? (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.billFile}</p>
            ) : null}
            {localSuccess ? (
              <p className="mt-2 text-sm text-emerald-600">{localSuccess}</p>
            ) : null}
          </div>
        </div>

        <div className="w-full xl:w-[180px]">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Created At</p>
            <p className="mt-1 text-sm text-gray-800">{item.created_at?.slice(0, 10)}</p>

            <p className="mt-4 text-xs font-medium text-gray-500">Reviewed By</p>
            <p className="mt-1 text-sm text-gray-800">
              {item.reviewed_by_details?.full_name || item.reviewed_by_details?.username || "-"}
            </p>

            <Link
              to={`/expenses/${item.id}`}
              className="mt-4 inline-block rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:shadow-md"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadBillPage() {
  const { extractErrorMessage } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [maxBillUploadSize, setMaxBillUploadSize] = useState(DEFAULT_MAX_BILL_UPLOAD_BYTES);

  const loadData = async () => {
    const [expenseData, advanceData, appConfig] = await Promise.all([
      listExpenses({ status: STATUS.APPROVED }),
      listAdvances(),
      getAppConfigApi(),
    ]);
    setExpenses(expenseData);
    setAdvances(advanceData);
    setMaxBillUploadSize(
      Number(appConfig?.max_bill_upload_size || DEFAULT_MAX_BILL_UPLOAD_BYTES)
    );
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        await loadData();
      } catch (apiError) {
        setError(extractErrorMessage(apiError, "Unable to load bill upload queue."));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [extractErrorMessage, setGlobalLoading]);

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

  const totalBalance = advances.reduce(
    (sum, item) => sum + Number(item.balance_amount || 0),
    0
  );

  const handleUpload = async (expenseId, payload) => {
    try {
      setUploadingId(expenseId);
      setGlobalLoading(true);
      setError("");
      setSuccess("");
      await uploadBill(expenseId, payload);
      setSuccess("Bill uploaded successfully.");
      await loadData();
      emitDashboardRefresh({ source: "bill-uploaded", expenseId });
      return true;
    } catch (apiError) {
      setError(extractErrorMessage(apiError, "Unable to upload bill."));
      return false;
    } finally {
      setUploadingId(null);
      setGlobalLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHero
          title="Upload Bill"
          subtitle="Upload bills only for approved expenses and keep the linked advance balance visible during submission."
          badge="Maker Bill Stage"
          badgeColor="blue"
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <SummaryCard title="Eligible Expenses" value={expenses.length} />
          <SummaryCard title="Ready for Bill Upload" value={filteredExpenses.length} />
          <SummaryCard title="Balance in Scope" value={formatCurrency(totalBalance)} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Approved Expenses Waiting for Bill
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Showing {filteredExpenses.length} expense(s).
                  </p>
                </div>

                <div className="w-full xl:w-[320px]">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by expense ID, advance ID, payable to, or category"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-900"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500">
                Loading approved expenses...
              </div>
            ) : filteredExpenses.length ? (
              filteredExpenses.map((item) => (
                <UploadRow
                  key={item.id}
                  item={item}
                  advance={advances.find((advance) => advance.id === item.advance)}
                  onUpload={handleUpload}
                  loading={uploadingId === item.id}
                  maxBillUploadSize={maxBillUploadSize}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <h4 className="text-lg font-semibold text-slate-700">
                  No approved expenses found
                </h4>
                <p className="mt-2 text-sm text-slate-500">
                  Approved expenses will appear here when bill upload becomes eligible.
                </p>
              </div>
            )}
          </div>

          <div>
            <UploadGuide maxBillUploadSize={maxBillUploadSize} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AppProviders";
import apiClient, {
  DASHBOARD_REFRESH_EVENT,
  ROLES,
  STATUS,
  emitDashboardRefresh,
  formatCurrency,
  getListData,
} from "../components/appCore";
import ContentCard from "../components/ContentCard";
import Layout from "../components/Layout";
import ExpenseTable from "../components/ExpenseTable";
import SummaryCard from "../components/SummaryCard";

async function listAdvances(params = {}) {
  const response = await apiClient.get("advances/", { params });
  return getListData(response.data);
}

async function getMakerBalances() {
  const response = await apiClient.get("advances/maker-balances/");
  return response.data;
}

async function getMakerDashboard() {
  const response = await apiClient.get("dashboard/maker/");
  return response.data;
}

async function getCheckerDashboard() {
  const response = await apiClient.get("dashboard/checker/");
  return response.data;
}

async function listExpenses(params = {}) {
  const response = await apiClient.get("expenses/", { params });
  return getListData(response.data);
}

async function listNotifications(params = {}) {
  const response = await apiClient.get("notifications/", { params });
  return {
    items: getListData(response.data),
    count: response.data?.count || 0,
    next: response.data?.next || null,
    previous: response.data?.previous || null,
  };
}

async function getUnreadNotificationCount() {
  const response = await apiClient.get("notifications/unread-count/");
  return response.data.unread_count || 0;
}

async function markNotificationRead(id) {
  const response = await apiClient.patch(`notifications/${id}/read/`);
  return response.data;
}

function WelcomeCard({ role, name }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold text-white">
            PC
          </div>

          <div>
            <h2 className="text-2xl font-medium text-gray-800">Welcome {name}</h2>
            <p className="mt-2 text-base text-gray-500">
              {role === ROLES.MAKER
                ? "Track your allocated advance, spend from the live balance, and keep bill submission on time."
                : "Allocate advances, review maker expenses, and keep running balances visible across the control flow."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, subtitle, path, primary = false, cta }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm transition hover:shadow-md lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl text-gray-700 shadow-sm">
          {primary ? "+" : "≡"}
        </div>
        <div>
          <h4 className="text-xl font-semibold text-gray-800">{title}</h4>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <Link
        to={path}
        className={`rounded-lg px-5 py-3 text-center text-sm font-medium transition hover:shadow-md ${
          primary
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

function LinkedSummaryCard({ title, value, to }) {
  const card = <SummaryCard title={title} value={value} />;

  if (!to) {
    return card;
  }

  return (
    <Link to={to} className="block transition hover:-translate-y-0.5">
      {card}
    </Link>
  );
}

function NotificationPanel({
  notifications = [],
  unreadCount = 0,
  emptyTitle,
  helperText,
  onOpenNotification,
}) {
  return (
    <ContentCard
      title="Recent Notifications"
      rightContent={
        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {unreadCount} unread
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {notifications.length ? (
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenNotification(item)}
              className={`rounded-lg border px-4 py-4 text-left transition ${
                item.is_read
                  ? "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  : "border-blue-100 bg-blue-50 hover:bg-blue-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                {!item.is_read ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    New
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600">{item.message}</p>
              <p className="mt-3 text-[11px] font-medium text-blue-900">
                {item.related_expense_reference || "Open details"}
              </p>
            </button>
          ))
        ) : (
          <div className="xl:col-span-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
            <p className="font-medium text-gray-800">{emptyTitle}</p>
            <p className="mt-1">{helperText}</p>
          </div>
        )}
      </div>
    </ContentCard>
  );
}

function BalanceSnapshot({ advances }) {
  return (
    <ContentCard title="Balance Snapshot">
      <div className="space-y-4">
        {advances.map((advance) => (
          <div key={advance.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{advance.reference}</p>
                <p className="mt-1 text-xs text-gray-500">{advance.status.replaceAll("_", " ")}</p>
              </div>
              <p className="text-sm font-semibold text-blue-600">
                {formatCurrency(advance.balance_amount)}
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Total {formatCurrency(advance.total_amount)} | Spent {formatCurrency(advance.spent_amount)}
            </p>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

function MakerDashboard({ dashboard, advances, expenses }) {
  const openExpenses = expenses.filter((item) => item.status !== STATUS.CLOSED);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <LinkedSummaryCard title="Total Advance" value={formatCurrency(dashboard.total_advance)} />
        <LinkedSummaryCard title="Total Spent" value={formatCurrency(dashboard.total_spent)} />
        <LinkedSummaryCard
          title="Remaining Balance"
          value={formatCurrency(dashboard.remaining_balance)}
          to="/active-advances"
        />
        <LinkedSummaryCard title="Pending Bills" value={dashboard.pending_bills} to="/upload-bill" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ContentCard title="Next Actions">
            <div className="space-y-4">
              <QuickAction
                title="Create New Expense"
                subtitle="Spend from an active advance and submit the expense for checker review."
                path="/new-expense"
                primary
                cta="+ New Expense"
              />
              <QuickAction
                title="Open My Expenses"
                subtitle="Track submitted, approved, bill submitted, and closed expense entries."
                path="/my-expenses"
                cta="View My Expenses"
              />
              <QuickAction
                title="Upload Bills"
                subtitle="Submit bills for approved expenses while keeping advance balance context visible."
                path="/upload-bill"
                cta="Upload Bill"
              />
            </div>
          </ContentCard>
        </div>

        <BalanceSnapshot advances={advances} />
      </div>

      <ContentCard
        title="Recent Expenses"
        rightContent={<Link to="/my-expenses" className="text-sm font-medium text-blue-900 hover:text-blue-800">View all</Link>}
      >
        <ExpenseTable
          data={openExpenses}
          emptyTitle="No expenses available"
          emptySubtitle="Create a new expense from an active advance to get started."
        />
      </ContentCard>
    </div>
  );
}

function CheckerDashboard({ dashboard, balances, expenses }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <LinkedSummaryCard title="Total Allocated" value={formatCurrency(dashboard.total_allocated)} />
        <LinkedSummaryCard
          title="Total Verified Spend"
          value={formatCurrency(dashboard.total_verified_spend)}
        />
        <LinkedSummaryCard
          title="Remaining Balance / Active Advances"
          value={formatCurrency(
            balances.reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0)
          )}
          to="/active-advances"
        />
        <LinkedSummaryCard
          title="Pending Reviews"
          value={dashboard.pending_reviews}
          to="/pending-verification"
        />
        <LinkedSummaryCard
          title="Pending Approvals"
          value={dashboard.pending_approvals}
          to="/pending-approval"
        />
        <LinkedSummaryCard
          title="Final Bill Verification"
          value={dashboard.pending_bill_verifications}
          to="/final-bill-verification"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ContentCard title="Checker Actions">
            <div className="space-y-4">
              <QuickAction
                title="Allocate Advance"
                subtitle="Assign a fresh advance to a maker and immediately expose the starting balance."
                path="/allocate-advance"
                primary
                cta="Allocate Advance"
              />
              <QuickAction
                title="Review Expense Queue"
                subtitle="Handle submitted expenses first, then move reviewed items to approval."
                path="/pending-verification"
                cta="Open Pending Verification"
              />
              <QuickAction
                title="Monitor Active Advances"
                subtitle="Watch maker-wise total advance, spent amount, and remaining balance in one table."
                path="/active-advances"
                cta="View Active Advances"
              />
            </div>
          </ContentCard>
        </div>

        <ContentCard title="Remaining Balance by Maker">
          <div className="space-y-4">
            {balances.map((maker) => (
              <div key={maker.maker_id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-800">{maker.maker_name}</p>
                  <p className="text-sm font-semibold text-blue-600">
                    {formatCurrency(maker.remaining_balance)}
                  </p>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Advance {formatCurrency(maker.total_advance)} | Spent {formatCurrency(maker.total_spent)}
                </p>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>

      <ContentCard title="Expenses Needing Checker Attention">
        <ExpenseTable
          data={expenses}
          emptyTitle="No checker actions pending"
          emptySubtitle="Submitted, reviewed, and bill-submitted expenses will appear here."
        />
      </ContentCard>
    </div>
  );
}

function sortCheckerQueue(expenses) {
  const stageOrder = {
    SUBMITTED: 0,
    REVIEWED: 1,
    BILL_SUBMITTED: 2,
  };

  return [...expenses].sort((left, right) => {
    const stageDiff = (stageOrder[left.status] ?? 99) - (stageOrder[right.status] ?? 99);
    if (stageDiff !== 0) {
      return stageDiff;
    }

    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role, user, extractErrorMessage } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [advances, setAdvances] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dashboardRequestRef = useRef(null);
  const notificationsRequestRef = useRef(null);

  const fetchDashboardSummary = useCallback(async () => {
    return role === ROLES.MAKER ? getMakerDashboard() : getCheckerDashboard();
  }, [role]);

  const fetchNotifications = useCallback(async () => {
    if (notificationsRequestRef.current) {
      return notificationsRequestRef.current;
    }

    const request = (async () => {
      const [response, count] = await Promise.all([
        listNotifications({ page_size: 6 }),
        getUnreadNotificationCount(),
      ]);

      setNotifications(response.items);
      setUnreadCount(count);
    })();

    notificationsRequestRef.current = request;

    try {
      await request;
    } finally {
      if (notificationsRequestRef.current === request) {
        notificationsRequestRef.current = null;
      }
    }
  }, []);

  const fetchActiveAdvances = useCallback(async () => {
    if (role !== ROLES.MAKER) {
      setAdvances([]);
      return [];
    }

    const advanceData = await listAdvances();
    setAdvances(advanceData);
    return advanceData;
  }, [role]);

  const fetchPendingReview = useCallback(async () => {
    if (role !== ROLES.CHECKER) {
      return [];
    }

    return listExpenses({ status: STATUS.SUBMITTED });
  }, [role]);

  const fetchPendingApproval = useCallback(async () => {
    if (role !== ROLES.CHECKER) {
      return [];
    }

    return listExpenses({ status: STATUS.REVIEWED });
  }, [role]);

  const fetchDashboardData = useCallback(
    async (showLoader = false) => {
      if (dashboardRequestRef.current) {
        return dashboardRequestRef.current;
      }

      const request = (async () => {
        try {
          if (showLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }
          setError("");

          if (role === ROLES.MAKER) {
            const [dashboardData, advanceData, expenseData] = await Promise.all([
              fetchDashboardSummary(),
              fetchActiveAdvances(),
              listExpenses(),
            ]);

            setDashboard(dashboardData);
            setAdvances(advanceData);
            setExpenses(expenseData);
            setBalances([]);
          } else if (role === ROLES.CHECKER) {
            const [
              dashboardData,
              balanceData,
              submittedExpenses,
              reviewedExpenses,
              billExpenses,
            ] = await Promise.all([
              fetchDashboardSummary(),
              getMakerBalances(),
              fetchPendingReview(),
              fetchPendingApproval(),
              listExpenses({ status: STATUS.BILL_SUBMITTED }),
            ]);

            setDashboard(dashboardData);
            setBalances(balanceData);
            setExpenses(
              sortCheckerQueue([
                ...submittedExpenses,
                ...reviewedExpenses,
                ...billExpenses,
              ])
            );
            setAdvances([]);
          }
        } catch (apiError) {
          setError(extractErrorMessage(apiError, "Unable to load dashboard."));
        } finally {
          if (showLoader) {
            setLoading(false);
          }
          setRefreshing(false);
        }
      })();

      dashboardRequestRef.current = request;

      try {
        await request;
      } finally {
        if (dashboardRequestRef.current === request) {
          dashboardRequestRef.current = null;
        }
      }
    },
    [
      extractErrorMessage,
      fetchActiveAdvances,
      fetchDashboardSummary,
      fetchPendingApproval,
      fetchPendingReview,
      role,
    ]
  );

  const handleOpenNotification = useCallback(
    async (notification) => {
      try {
        if (!notification.is_read) {
          const response = await markNotificationRead(notification.id);
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id ? response.notification : item
            )
          );
          setUnreadCount(response.unread_count);
          emitDashboardRefresh({ source: "dashboard-notification-open" });
        }
      } catch {
        // Navigation should still proceed if marking as read fails.
      }

      if (notification.related_expense) {
        navigate(`/expenses/${notification.related_expense}`);
      }
    },
    [navigate]
  );

  useEffect(() => {
    async function loadInitialState() {
      await Promise.all([fetchDashboardData(true), fetchNotifications()]);
    }

    loadInitialState();
  }, [fetchDashboardData, fetchNotifications]);

  useEffect(() => {
    function handleRefreshEvent() {
      fetchDashboardData(false);
      fetchNotifications();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchDashboardData(false);
        fetchNotifications();
      }
    }

    window.addEventListener(DASHBOARD_REFRESH_EVENT, handleRefreshEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(DASHBOARD_REFRESH_EVENT, handleRefreshEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchDashboardData, fetchNotifications]);

  const displayName = useMemo(
    () => user?.full_name || user?.username || "User",
    [user]
  );

  if (role === ROLES.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <WelcomeCard role={role} name={displayName} />

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading || !dashboard ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-md">
            Loading dashboard...
          </div>
        ) : (
          <>
            

            {refreshing ? (
              <div className="text-right text-xs font-medium text-gray-400">
                Refreshing dashboard...
              </div>
            ) : null}

            {role === ROLES.MAKER ? (
              <MakerDashboard dashboard={dashboard} advances={advances} expenses={expenses} />
            ) : (
              <CheckerDashboard dashboard={dashboard} balances={balances} expenses={expenses} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

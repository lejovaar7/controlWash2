import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@/layouts/AppLayout";
import { PlatformLayout } from "@/layouts/PlatformLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { BranchesPage } from "@/pages/BranchesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { MembersPage } from "@/pages/MembersPage";
import { NoBranchAccessPage } from "@/pages/NoBranchAccessPage";
import { NoCompanyPage } from "@/pages/NoCompanyPage";
import { PlatformHomePage } from "@/pages/PlatformHomePage";
import { PlatformNewOrganizationPage } from "@/pages/PlatformNewOrganizationPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SetupAccountPage } from "@/pages/SetupAccountPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { ProductSetupPage } from "@/pages/ProductSetupPage";
import { QueuePage } from "@/pages/QueuePage";
import { FinancePage } from "@/pages/FinancePage";
import { InventoryPage } from "@/pages/InventoryPage";
import { RetailSalesPage } from "@/pages/RetailSalesPage";
import { CustomersVehiclesPage } from "@/pages/CustomersVehiclesPage";
import { WorkersPage } from "@/pages/WorkersPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { ReportsPage } from "@/pages/ReportsPage";

export const router = createBrowserRouter([
	{
		element: <PublicLayout />,
		children: [
			{ index: true, element: <HomePage /> },
			{ path: "login", element: <LoginPage /> },
			{ path: "verify-email", element: <VerifyEmailPage /> },
			{ path: "forgot-password", element: <ForgotPasswordPage /> },
			{ path: "reset-password", element: <ResetPasswordPage /> },
			{ path: "setup-account", element: <SetupAccountPage /> },
			{ path: "no-company", element: <NoCompanyPage /> },
			// Public signup is disabled; the old route must not linger.
			{ path: "register", element: <Navigate to="/login" replace /> },
			{ path: "onboarding", element: <Navigate to="/app/dashboard" replace /> },
		],
	},
	{
		path: "platform",
		element: <PlatformLayout />,
		children: [
			{ index: true, element: <PlatformHomePage /> },
			{
				path: "organizations/new",
				element: <PlatformNewOrganizationPage />,
			},
		],
	},
	{
		path: "app",
		element: <AppLayout />,
		children: [
			{ index: true, element: <Navigate to="/app/dashboard" replace /> },
			{ path: "dashboard", element: <DashboardPage /> },
			{ path: "queue", element: <QueuePage /> },
			{ path: "cash", element: <FinancePage /> },
			{ path: "inventory", element: <InventoryPage /> },
			{ path: "sales", element: <RetailSalesPage /> },
			{ path: "customers", element: <CustomersVehiclesPage /> },
			{ path: "workers", element: <WorkersPage /> },
			{ path: "services", element: <ServicesPage /> },
			{ path: "reports", element: <ReportsPage /> },
			{ path: "wash-setup", element: <ProductSetupPage /> },
			{ path: "branches", element: <BranchesPage /> },
			{ path: "no-branch-access", element: <NoBranchAccessPage /> },
			{ path: "members", element: <MembersPage /> },
			{ path: "settings", element: <SettingsPage /> },
		],
	},
	{ path: "*", element: <Navigate to="/" replace /> },
]);

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { ProfilePage } from "./pages/ProfilePage";
import { MenuPage } from "./pages/MenuPage";
import { ResultsPage } from "./pages/ResultsPage";
import { SessionProvider } from "./state/SessionContext";
import "./styles/index.css";

// Register the service worker (auto-update). No-op during `vite dev`.
registerSW({ immediate: true });

// Routes mirror MVP Requirements Section 6.5.
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <ProfilePage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "results", element: <ResultsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </React.StrictMode>,
);

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { configureApiBaseUrl } from "./api/config";
import { App } from "./App";
import "./styles.css";

configureApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

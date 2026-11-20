import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { keepFocus } from "./lib/keepFocus";
import "./index.css";
import "./pages/Game.css";

keepFocus();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

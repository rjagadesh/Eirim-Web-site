import React from "react";
import ReactDOM from "react-dom/client";
import EirimFrontDesk from "./EirimFrontDesk.jsx";
import Telehealth from "./Telehealth.jsx";
import Chatbot from "./Chatbot.jsx";
import Admin from "./Admin.jsx";
import { track } from "./track.js";

const path = window.location.pathname.replace(/\/+$/, "");
const isAdmin = path === "/admin";
const isTelehealth = path === "/telehealth";

// Log public traffic (never the admin page itself).
if (!isAdmin) track();

function App() {
  if (isAdmin) return <Admin />;
  if (isTelehealth) {
    return (
      <>
        <Telehealth />
        <Chatbot />
      </>
    );
  }
  return (
    <>
      <EirimFrontDesk />
      <Chatbot />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

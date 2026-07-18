import React from "react";
import ReactDOM from "react-dom/client";
import EirimFrontDesk from "../EirimFrontDesk.jsx";
import Chatbot from "./Chatbot.jsx";
import Admin from "./Admin.jsx";
import { track } from "./track.js";

// Hidden admin route — reachable only by typing /admin in the URL. There is no
// link, button, or tab to it anywhere on the public site.
const isAdmin = window.location.pathname.replace(/\/+$/, "") === "/admin";

// Log public traffic (never the admin page itself).
if (!isAdmin) track();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? (
      <Admin />
    ) : (
      <>
        <EirimFrontDesk />
        <Chatbot />
      </>
    )}
  </React.StrictMode>
);

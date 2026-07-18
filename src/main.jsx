import React from "react";
import ReactDOM from "react-dom/client";
import EirimFrontDesk from "../EirimFrontDesk.jsx";
import Chatbot from "./Chatbot.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EirimFrontDesk />
    <Chatbot />
  </React.StrictMode>
);

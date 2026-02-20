import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home.jsx";
import BB84 from "./pages/BB84Page.jsx";
import E91 from "./pages/E91Page.jsx";

import Sidebar from "./components/Sidebar.jsx";
import AboutQKD from "./pages/AboutQKD.jsx";
import AboutBB84 from "./pages/AboutBB84.jsx";
import AboutE91 from "./pages/AboutE91.jsx";

export default function App() {
  return (
    <>
      <Sidebar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bb84" element={<BB84 />} />
        <Route path="/e91" element={<E91 />} />

        <Route path="/about/qkd" element={<AboutQKD />} />
        <Route path="/about/bb84" element={<AboutBB84 />} />
        <Route path="/about/e91" element={<AboutE91 />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

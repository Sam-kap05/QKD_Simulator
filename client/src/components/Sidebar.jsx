import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const panelRef = useRef(null);
  const location = useLocation();

  // close sidebar on route change
  useEffect(() => {
    setOpen(false);
    setAboutOpen(false);
  }, [location.pathname]);

  // close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setAboutOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // click outside to close
  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        setAboutOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      {/* Hamburger button (top-left) */}
      <button
        className="qc-hamburger"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Backdrop */}
      <div
        className={`qc-sidebarBackdrop ${open ? "isOpen" : ""}`}
        onClick={() => {
          setOpen(false);
          setAboutOpen(false);
        }}
      />

      {/* Sidebar */}
      <aside
        ref={panelRef}
        className={`qc-sidebar ${open ? "isOpen" : ""}`}
        aria-hidden={!open}
      >
        <div className="qc-sidebarHeader">
          <div className="qc-sidebarTitle"></div>
          <button
            className="qc-sidebarClose"
            aria-label="Close menu"
            onClick={() => {
              setOpen(false);
              setAboutOpen(false);
            }}
          >
            ✕
          </button>
        </div>

        <nav className="qc-sidebarNav">
          <Link className="qc-sidebarLink" to="/">
            Home
          </Link>

          <button
            className="qc-sidebarLink qc-sidebarDropdown"
            onClick={() => setAboutOpen((v) => !v)}
            aria-expanded={aboutOpen}
          >
            Read About
            <span className={`qc-caret ${aboutOpen ? "up" : ""}`}>▾</span>
          </button>

          <div className={`qc-sidebarSub ${aboutOpen ? "open" : ""}`}>
            <Link className="qc-sidebarSublink" to="/about/qkd">
              Quantum Key Distribution (QKD)
            </Link>
            <Link className="qc-sidebarSublink" to="/about/bb84">
              BB84 Protocol
            </Link>
            <Link className="qc-sidebarSublink" to="/about/e91">
              E91 Protocol
            </Link>
          </div>
        </nav>

        <div className="qc-sidebarFooter">
          <div className="qc-sidebarHint">ESC or click outside to close</div>
        </div>
      </aside>
    </>
  );
}

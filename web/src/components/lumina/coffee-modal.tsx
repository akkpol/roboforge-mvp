"use client";

import { useEffect } from "react";
import { Coffee, Download, X } from "lucide-react";

type CoffeeModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CoffeeModal({ open, onClose }: CoffeeModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="coffee-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="เลี้ยงกาแฟผู้พัฒนา">
      <div className="coffee-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ปุ่มปิด */}
        <button onClick={onClose} className="coffee-modal-close" aria-label="ปิด">
          <X />
        </button>

        {/* หัว */}
        <div className="coffee-modal-header">
          <div className="coffee-modal-icon">
            <Coffee />
          </div>
          <h2 className="coffee-modal-title">☕ เลี้ยงกาแฟผู้พัฒนา</h2>
          <p className="coffee-modal-sub">
            ขอบคุณที่สนับสนุน RoboForge — สแกน QR ด้านล่างเพื่อเลี้ยงกาแฟผู้พัฒนาได้เลย!
          </p>
        </div>

        {/* QR Image */}
        <div className="coffee-modal-qr">
          <img
            src="/assets/qr-coffee.jpg"
            alt="QR Code เลี้ยงกาแฟผู้พัฒนา"
            className="coffee-modal-qr-img"
          />
        </div>

        {/* ปุ่มดาวน์โหลด */}
        <a
          href="/assets/qr-coffee.jpg"
          download="roborforge-coffee-qr.jpg"
          className="coffee-modal-download"
        >
          <Download />
          ดาวน์โหลด QR
        </a>
      </div>
    </div>
  );
}

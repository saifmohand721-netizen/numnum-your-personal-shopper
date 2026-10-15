import { getStatusLabel } from "@/lib/order-status";

type PdfOrder = {
  id: string;
  created_at: string;
  store_type: string;
  items_list: string;
  delivery_address: string;
  status: string;
  purchase_price: number | null;
  delivery_fee: number | null;
  total_price: number | null;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (n: number | null) => `${Number(n ?? 0).toLocaleString("ar-IQ")} د.ع`;
const date = (d: string) => new Date(d).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });

// Renders an Arabic RTL report off-screen (so the browser shapes Arabic text), then rasterizes it into an A4 PDF.
export async function exportOrdersPdf(account: string, orders: PdfOrder[]) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas-pro")]);
  const total = orders.reduce((s, o) => s + Number(o.total_price ?? 0), 0);
  const el = document.createElement("div");
  el.dir = "rtl";
  el.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;padding:36px;background:#ffffff;color:#0F172A;font-family:Tajawal,sans-serif;font-size:13px;line-height:1.6";
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #FF5722;padding-bottom:12px">
      <div><div style="font-size:24px;font-weight:900;color:#FF5722">دز</div><div>كشف الطلبات</div></div>
      <div style="text-align:left"><div dir="ltr">${esc(account)}</div><div style="color:#64748b">${date(new Date().toISOString())}</div></div>
    </div>
    <p style="margin:12px 0">عدد الطلبات: <b>${orders.length}</b> — المجموع الكلي: <b style="color:#FF5722">${money(total)}</b></p>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#0F172A;color:#ffffff">
        ${["التاريخ", "التفاصيل", "المبلغ", "الحالة"].map((h) => `<th style="padding:8px;text-align:right">${h}</th>`).join("")}
      </tr></thead>
      <tbody>${orders.map((o, i) => `
        <tr style="background:${i % 2 ? "#f8fafc" : "#ffffff"};border-bottom:1px solid #e2e8f0">
          <td style="padding:8px;vertical-align:top;white-space:nowrap">${date(o.created_at)}</td>
          <td style="padding:8px;vertical-align:top"><b>${esc(o.store_type)}</b><div style="white-space:pre-wrap">${esc(o.items_list)}</div><div style="color:#64748b">📍 ${esc(o.delivery_address)}</div></td>
          <td style="padding:8px;vertical-align:top;white-space:nowrap">${money(o.total_price)}<div style="color:#64748b;font-size:11px">مشتريات ${money(o.purchase_price)}<br/>توصيل ${money(o.delivery_fee)}</div></td>
          <td style="padding:8px;vertical-align:top">${esc(getStatusLabel(o.status))}</td>
        </tr>`).join("") || `<tr><td colspan="4" style="padding:16px;text-align:center">لا توجد طلبات</td></tr>`}
      </tbody>
    </table>`;
  document.body.appendChild(el);
  try {
    await document.fonts?.ready;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const pageCanvasH = Math.floor((canvas.width * ph) / pw);
    for (let y = 0, page = 0; y < canvas.height; y += pageCanvasH, page++) {
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.min(pageCanvasH, canvas.height - y);
      slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, (slice.height * pw) / canvas.width);
    }
    pdf.save(`diz-orders-${account.replace(/[^\w.-]+/g, "_")}.pdf`);
  } finally {
    el.remove();
  }
}

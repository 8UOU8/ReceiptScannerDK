import { ReceiptItem } from "../types";

export const generateCSV = (receipts: ReceiptItem[]): void => {
  // Filter only completed items
  const completedReceipts = receipts.filter(r => r.status === 'COMPLETED' && r.data);

  if (completedReceipts.length === 0) {
    alert("No processed data available to export.");
    return;
  }

  // Updated headers and order: Date, Total, Moms, Shop Name
  const headers = ["Date (YYYY-MM-DD)", "Total Amount (DKK)", "MOMS (DKK)", "Shop Name"];
  
  const rows = completedReceipts.map(r => {
    const data = r.data!;
    return [
      data.purchaseDate,
      data.totalAmount.toFixed(2),
      data.moms.toFixed(2),
      `"${data.shopName.replace(/"/g, '""')}"` // Escape quotes
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Add BOM for Excel compatibility with UTF-8 (important for Danish characters like æ, ø, å)
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `receipts_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
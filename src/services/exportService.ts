import { db } from '../db';
import { formatPesos } from '../utils/money';
import { calculateTotalRealBalance, calculateTotalActiveReserves, calculateFreeBalance } from '../core/calculator';

/**
 * Exporta el historial de transacciones a un archivo CSV compatible con Excel (UTF-8 con BOM).
 */
export async function exportTransactionsToCSV(): Promise<void> {
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const accounts = await db.accounts.toArray();
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  // Ordenar por fecha descendente
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const headers = ['Fecha', 'Tipo', 'Cuenta', 'Cuenta Destino', 'Categoría', 'Monto ARS', 'Descripción', 'Notas'];

  const rows = transactions.map((tx) => {
    const typeLabel =
      tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Transferencia';
    const accountName = accountMap.get(tx.accountId) || 'Desconocida';
    const destName = tx.destinationAccountId ? accountMap.get(tx.destinationAccountId) || '' : '';

    return [
      tx.date,
      typeLabel,
      `"${accountName.replace(/"/g, '""')}"`,
      `"${destName.replace(/"/g, '""')}"`,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      Math.round(tx.amount),
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  // Prefijo BOM \uFEFF para que Excel reconozca codificación UTF-8
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `movimientos_financieros_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Abre una ventana con reporte ejecutivo imprimible / guardable en PDF.
 */
export async function printFinancialReportPDF(): Promise<void> {
  const accounts = await db.accounts.filter((a) => !a.isDeleted).toArray();
  const transactions = await db.transactions.filter((tx) => !tx.isDeleted).toArray();
  const reserves = await db.virtualReserves.filter((r) => r.status === 'active').toArray();
  const debts = await db.debts.filter((d) => !d.isDeleted && d.status !== 'paid').toArray();
  const recurring = await db.recurringObligations.filter((r) => !r.isDeleted && r.isActive).toArray();

  const totalReal = calculateTotalRealBalance(accounts, transactions);
  const totalReserved = calculateTotalActiveReserves(reserves);
  const freeBalance = calculateFreeBalance(totalReal, totalReserved);

  const todayStr = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilitá las ventanas emergentes para generar el PDF.');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Estado Financiero Consolidado - ${todayStr}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 30px;
      color: #111827;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #08090c;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 {
      font-size: 20px;
      margin: 0;
      color: #08090c;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 11px;
      color: #6b7280;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .metric-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      background: #f9fafb;
    }
    .metric-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #4b5563;
    }
    .metric-val {
      font-size: 18px;
      font-weight: 800;
      margin-top: 4px;
      font-family: monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f3f4f6;
      text-align: left;
      padding: 8px;
      font-size: 10px;
      text-transform: uppercase;
      border-bottom: 1px solid #d1d5db;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }
    .text-right {
      text-align: right;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 3px solid #2563eb;
      padding-left: 8px;
    }
    .footer {
      margin-top: 35px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { margin: 15mm; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Estado de Posición Financiera</h1>
      <div class="subtitle">Terminal Financiera Personal • ARS sin decimales</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold;">Fecha de Emisión:</div>
      <div>${todayStr}</div>
    </div>
  </div>

  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-label">Saldo Real Total</div>
      <div class="metric-val" style="color: #111827;">${formatPesos(totalReal)}</div>
      <div style="font-size: 10px; color: #6b7280;">Liquidez física disponible</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Dinero Reservado</div>
      <div class="metric-val" style="color: #b91c1c;">${formatPesos(totalReserved)}</div>
      <div style="font-size: 10px; color: #6b7280;">Compromisos asegurados</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Saldo Libre</div>
      <div class="metric-val" style="color: #059669;">${formatPesos(freeBalance)}</div>
      <div style="font-size: 10px; color: #6b7280;">Capacidad de gasto libre</div>
    </div>
  </div>

  <div class="section-title">Distribución por Cuentas y Liquidez</div>
  <table>
    <thead>
      <tr>
        <th>Cuenta</th>
        <th>Tipo</th>
        <th class="text-right">Saldo Actual</th>
      </tr>
    </thead>
    <tbody>
      ${accounts
        .map((acc) => {
          const accTx = transactions.filter((t) => t.accountId === acc.id);
          let bal = acc.initialBalance;
          for (const t of accTx) {
            if (t.type === 'income') bal += t.amount;
            else if (t.type === 'expense') bal -= t.amount;
            else if (t.type === 'transfer') {
              bal -= t.amount;
              if (t.destinationAccountId === acc.id) bal += t.amount;
            }
          }
          return `
          <tr>
            <td><strong>${acc.name}</strong></td>
            <td>${acc.type === 'bank' ? 'Bancaria' : acc.type === 'wallet' ? 'Billetera Virtual' : 'Efectivo'}</td>
            <td class="text-right" style="font-family: monospace; font-weight: bold;">${formatPesos(bal)}</td>
          </tr>
        `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="section-title">Pasivos Pendientes (Deudas Activas)</div>
  <table>
    <thead>
      <tr>
        <th>Obligación</th>
        <th>Acreedor</th>
        <th>Vencimiento</th>
        <th class="text-right">Saldo Pendiente</th>
      </tr>
    </thead>
    <tbody>
      ${
        debts.length === 0
          ? `<tr><td colspan="4" style="text-align: center; color: #9ca3af;">Sin deudas pendientes registradas.</td></tr>`
          : debts
              .map(
                (d) => `
          <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.creditor}</td>
            <td>${d.dueDate}</td>
            <td class="text-right" style="font-family: monospace; font-weight: bold; color: #b91c1c;">${formatPesos(d.remainingAmount)}</td>
          </tr>
        `
              )
              .join('')
      }
    </tbody>
  <div class="section-title">Gastos Fijos y Periódicos</div>
  <table>
    <thead>
      <tr>
        <th>Obligación</th>
        <th>Frecuencia</th>
        <th>Día de Cobro/Vencimiento</th>
        <th class="text-right">Monto Estimado</th>
      </tr>
    </thead>
    <tbody>
      ${
        recurring.length === 0
          ? `<tr><td colspan="4" style="text-align: center; color: #9ca3af;">Sin gastos fijos registrados.</td></tr>`
          : recurring
              .map(
                (r) => `
          <tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.frequency}</td>
            <td>Día ${r.dueDay}</td>
            <td class="text-right" style="font-family: monospace; font-weight: bold;">${formatPesos(r.expectedAmount)}</td>
          </tr>
        `
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="section-title">Asignación de Reservas Activas</div>
  <table>
    <thead>
      <tr>
        <th>Destino Asignado</th>
        <th>Tipo</th>
        <th class="text-right">Monto Apartado</th>
      </tr>
    </thead>
    <tbody>
      ${
        reserves.length === 0
          ? `<tr><td colspan="3" style="text-align: center; color: #9ca3af;">Sin reservas virtuales activas.</td></tr>`
          : reserves
              .map(
                (r) => `
          <tr>
            <td><strong>${r.targetName}</strong></td>
            <td>${r.targetType === 'debt' ? 'Deuda' : r.targetType === 'recurring_obligation' ? 'Gasto Fijo' : 'Ahorro'}</td>
            <td class="text-right" style="font-family: monospace; font-weight: bold;">${formatPesos(r.amountReserved)}</td>
          </tr>
        `
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="footer">
    Documento generado por Terminal Financiera Personal • Modelo de Control Anti-Déficit y Liquidez Real
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

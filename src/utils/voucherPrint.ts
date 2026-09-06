import { RemittanceTransaction, Branch, Company, Language, OperatorProfile } from '../types';

export function generateVoucherHtml({
  transaction,
  branch,
  partner,
  operatorProfile,
  language = 'my',
}: {
  transaction: RemittanceTransaction;
  branch: Branch;
  partner?: Company;
  operatorProfile: OperatorProfile;
  language?: Language;
}): string {
  const isOutward = transaction.type === 'OUTWARD';
  const createdDate = new Date(transaction.createdDate).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const voucherTitle = isOutward
    ? (language === 'my' ? 'ငွေလွှဲပို့ ပြေစာ (OUTWARD REMITTANCE SLIP)' : 'OUTWARD REMITTANCE SLIP')
    : (language === 'my' ? 'ငွေလွှဲထုတ် ပြေစာ (INWARD PAYOUT VOUCHER)' : 'INWARD PAYOUT VOUCHER');

  const payoutMethodText = (() => {
    switch (transaction.payoutMethod) {
      case 'CASH_PICKUP':
        return language === 'my' ? 'ဘဏ်ကောင်တာ ငွေသားထုတ်ယူခြင်း (Cash Counter Pickup)' : 'Cash Counter Pickup';
      case 'BANK_ACCOUNT':
        return language === 'my'
          ? `ဘဏ်အကောင့်သို့ တိုက်ရိုက်ထည့်သွင်းခြင်း (${transaction.payoutBankName || 'Bank'})`
          : `Bank Account Deposit (${transaction.payoutBankName || 'Bank'})`;
      case 'MOBILE_WALLET':
        return language === 'my' ? 'မိုဘိုင်းပိုက်ဆံအိတ် (Mobile Wallet)' : 'Mobile Wallet';
      default:
        return transaction.payoutMethod;
    }
  })();

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voucher_${transaction.mtcn}_${transaction.transactionNo}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Pyidaungsu", "Myanmar3", "Noto Sans Myanmar", sans-serif;
      color: #0f172a;
      background-color: #f8fafc;
      line-height: 1.45;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      max-width: 800px;
      margin: 20px auto;
      background: #ffffff;
      padding: 32px 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-print {
      background: #059669;
      color: white;
    }
    .btn-print:hover {
      background: #047857;
    }
    .btn-close {
      background: #334155;
      color: white;
    }
    .btn-close:hover {
      background: #475569;
    }

    /* Header */
    .voucher-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .sys-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sys-logo {
      width: 40px;
      height: 40px;
      background: #0f172a;
      color: #34d399;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 15px;
    }
    .sys-title h1 {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      color: #0f172a;
    }
    .sys-title p {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .voucher-type-badge {
      display: inline-block;
      padding: 5px 12px;
      background: #0f172a;
      color: #34d399;
      border-radius: 6px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
    }
    .meta-line {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .ref-code {
      font-family: monospace;
      font-weight: 700;
      color: #0f172a;
      font-size: 12px;
    }

    /* Official Orange Rectangular Box */
    .orange-box {
      border: 2px solid #f97316;
      background: #fff7ed;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .orange-box-head {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #fed7aa;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .orange-box-icon {
      width: 38px;
      height: 38px;
      background: #ea580c;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      flex-shrink: 0;
    }
    .orange-box-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .badge-orange {
      background: #ea580c;
      color: #ffffff;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-license {
      background: #ffedd5;
      color: #7c2d12;
      border: 1px solid #fdba74;
      font-size: 10px;
      font-family: monospace;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .company-name {
      font-size: 15px;
      font-weight: 900;
      color: #431407;
      line-height: 1.25;
    }
    .orange-box-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 10px;
      font-size: 11.5px;
      color: #334155;
    }
    .orange-box-grid strong {
      color: #431407;
    }
    .branch-footer {
      border-top: 1px solid #fed7aa;
      margin-top: 10px;
      padding-top: 8px;
      font-size: 11px;
      color: #475569;
    }

    /* MTCN Golden Banner */
    .mtcn-box {
      border: 2px solid #fcd34d;
      background: #fffbeb;
      border-radius: 10px;
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .mtcn-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #78350f;
      letter-spacing: 0.5px;
    }
    .mtcn-number {
      font-family: monospace;
      font-size: 26px;
      font-weight: 900;
      color: #451a03;
      letter-spacing: 2px;
      line-height: 1.1;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    /* 2 Columns: Sender & Receiver */
    .party-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .party-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f8fafc;
    }
    .party-card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .party-row {
      margin-bottom: 4px;
      font-size: 12px;
    }
    .party-row .label {
      color: #64748b;
      font-size: 11px;
    }
    .party-row .value {
      color: #0f172a;
      font-weight: 700;
    }

    /* Financial Table */
    .fin-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .fin-table th {
      background: #f1f5f9;
      text-align: left;
      padding: 8px 12px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
    }
    .fin-table td {
      padding: 7px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .fin-table .row-alt {
      background: #f8fafc;
    }
    .fin-table .val {
      text-align: right;
      font-family: monospace;
      font-weight: 700;
      color: #0f172a;
    }
    .fin-table .total-row {
      background: #ecfdf5;
      font-weight: 800;
      font-size: 13.5px;
    }
    .fin-table .total-row td {
      color: #065f46;
      border-top: 2px solid #a7f3d0;
      padding: 10px 12px;
    }
    .fin-table .total-row .val {
      color: #047857;
      font-size: 15px;
    }

    /* Details info */
    .details-box {
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 11.5px;
      color: #475569;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 20px;
    }
    .details-box strong {
      color: #0f172a;
    }

    /* Signatures */
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e1;
      text-align: center;
    }
    .sig-line {
      height: 48px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stamp-box {
      border: 1px dashed #94a3b8;
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .sig-name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .sig-title {
      font-size: 10px;
      color: #64748b;
    }

    /* Legal statement */
    .legal-notice {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.5;
    }

    @media print {
      body {
        background: #ffffff !important;
      }
      .no-print, .no-print-bar {
        display: none !important;
      }
      .page-container {
        margin: 0;
        padding: 0;
        box-shadow: none;
        border: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <!-- Print action toolbar for browsers opening in dedicated window/tab -->
  <div class="no-print-bar no-print">
    <div style="display:flex; align-items:center; gap: 10px;">
      <span style="font-weight:800; font-size:14px; color:#34d399;">🖨️ ${language === 'my' ? 'ပြေစာ ပုံနှိပ်ခြင်း' : 'Remittance Print View'}</span>
      <span style="font-size:11px; opacity: 0.8; font-family: monospace;">Ref: ${transaction.transactionNo} | MTCN: ${transaction.mtcn}</span>
    </div>
    <div style="display:flex; align-items:center; gap: 8px;">
      <button onclick="window.print()" class="btn btn-print">
        🖨️ ${language === 'my' ? 'ပုံနှိပ်မည် (Print / PDF)' : 'Print / Save as PDF'}
      </button>
      <button onclick="window.close()" class="btn btn-close">
        ✕ ${language === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}
      </button>
    </div>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="voucher-header">
      <div class="sys-brand">
        <div class="sys-logo">RMS</div>
        <div class="sys-title">
          <h1>REMITTANCE MANAGEMENT SYSTEM</h1>
          <p>${language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲလုပ်ငန်း စနစ်' : 'Domestic & International Remittance System'}</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="voucher-type-badge">${voucherTitle}</span>
        <div class="meta-line">${language === 'my' ? 'နေ့စွဲ' : 'Date'}: ${createdDate}</div>
        <div class="ref-code">Ref: ${transaction.transactionNo}</div>
      </div>
    </div>

    <!-- Official Orange Rectangular Box -->
    <div class="orange-box">
      <div class="orange-box-head">
        <div class="orange-box-icon">🏛️</div>
        <div>
          <div class="orange-box-badges">
            <span class="badge-orange">${language === 'my' ? 'ငွေလွှဲဝန်ဆောင်မှု လုပ်ငန်းလုပ်ကိုင်ခွင့်ရ ကုမ္ပဏီ' : 'LICENSED REMITTANCE OPERATOR'}</span>
            ${operatorProfile.licenseNo ? `<span class="badge-license">${operatorProfile.licenseNo}</span>` : ''}
          </div>
          <div class="company-name">
            ${language === 'my' ? `${operatorProfile.companyNameMm} (${operatorProfile.companyNameEn})` : operatorProfile.companyNameEn}
          </div>
        </div>
      </div>
      <div class="orange-box-grid">
        <div>
          <strong>${language === 'my' ? 'ရုံးချုပ် လိပ်စာ' : 'Head Office'}: </strong>
          <span>${language === 'my' ? operatorProfile.addressMm : operatorProfile.addressEn}</span>
        </div>
        <div>
          <strong>${language === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Contact Phone'}: </strong>
          <span style="font-family: monospace; font-weight: 700;">${operatorProfile.phone}</span>
          ${operatorProfile.hotline ? `<span style="margin-left: 6px; color:#c2410c;">(Hotline: <b>${operatorProfile.hotline}</b>)</span>` : ''}
        </div>
      </div>
      <div class="branch-footer">
        <strong>${language === 'my' ? 'လုပ်ငန်းဆောင်ရွက်သည့် ဘဏ်ခွဲ' : 'Servicing Branch'}: </strong>
        <span>${language === 'my' ? branch.nameMm : branch.nameEn}</span>
        <span style="opacity: 0.85;"> • ${branch.phone} • ${branch.address}</span>
      </div>
    </div>

    <!-- MTCN Golden Banner -->
    <div class="mtcn-box">
      <div>
        <div class="mtcn-label">${language === 'my' ? 'ငွေလွှဲ လျှို့ဝှက်ကုဒ် / MTCN' : 'Money Transfer Control Number (MTCN)'}</div>
        <div class="mtcn-number">${transaction.mtcn}</div>
      </div>
      <div style="text-align: right;">
        <span class="status-badge">${transaction.status}</span>
      </div>
    </div>

    <!-- 2 Columns: Sender & Receiver -->
    <div class="party-grid">
      <div class="party-card">
        <div class="party-card-title">${language === 'my' ? 'ငွေလွှဲပို့သူ (SENDER)' : 'SENDER INFORMATION'}</div>
        <div class="party-row">
          <div class="label">${language === 'my' ? 'အမည်' : 'Name'}:</div>
          <div class="value">${language === 'my' && transaction.senderNameMm ? `${transaction.senderNameMm} (${transaction.senderName})` : transaction.senderName}</div>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.senderNrc || 'N/A'}</span>
        </div>
        ${transaction.senderPassport ? `
        <div class="party-row">
          <span class="label">${language === 'my' ? 'နိုင်ငံကူးလက်မှတ်' : 'Passport No'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.senderPassport}</span>
        </div>` : ''}
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>
          <span class="value"> ${transaction.senderPhone}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'နိုင်ငံ' : 'Country'}:</span>
          <span class="value"> ${transaction.senderCountryCode}</span>
        </div>
      </div>

      <div class="party-card">
        <div class="party-card-title">${language === 'my' ? 'ငွေလက်ခံသူ (BENEFICIARY)' : 'BENEFICIARY / RECEIVER'}</div>
        <div class="party-row">
          <div class="label">${language === 'my' ? 'အမည်' : 'Name'}:</div>
          <div class="value">${language === 'my' && transaction.receiverNameMm ? `${transaction.receiverNameMm} (${transaction.receiverName})` : transaction.receiverName}</div>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.receiverNrc || 'N/A'}</span>
        </div>
        ${transaction.receiverPassport ? `
        <div class="party-row">
          <span class="label">${language === 'my' ? 'နိုင်ငံကူးလက်မှတ်' : 'Passport No'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.receiverPassport}</span>
        </div>` : ''}
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>
          <span class="value"> ${transaction.receiverPhone}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ခရီးဆုံး နိုင်ငံ' : 'Destination'}:</span>
          <span class="value"> ${transaction.receiverCountryCode}</span>
        </div>
      </div>
    </div>

    <!-- Financial Breakdown Table -->
    <table class="fin-table">
      <thead>
        <tr>
          <th colspan="2">${language === 'my' ? 'ငွေပမာဏ နှင့် ငွေလဲလှယ်နှုန်း အသေးစိတ်' : 'FINANCIAL & EXCHANGE SETTLEMENT DETAILS'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${language === 'my' ? 'လွှဲပို့ငွေ မူလပမာဏ (Send Principal)' : 'Send Principal Amount'}:</td>
          <td class="val">${transaction.sendAmount.toLocaleString()} ${transaction.sourceCurrency}</td>
        </tr>
        <tr class="row-alt">
          <td>${language === 'my' ? 'တွက်ချက်ထားသော ငွေလဲနှုန်း (Applied Exchange Rate)' : 'Applied Exchange Rate'}:</td>
          <td class="val">1 ${transaction.sourceCurrency === 'MMK' ? transaction.targetCurrency : transaction.sourceCurrency} = ${transaction.exchangeRate.toLocaleString()} MMK</td>
        </tr>
        <tr>
          <td>${language === 'my' ? 'ငွေလွှဲ ဝန်ဆောင်ခ (Service Fee)' : 'Remittance Service Fee'}:</td>
          <td class="val">${transaction.serviceFee.toLocaleString()} MMK</td>
        </tr>
        ${transaction.commissionFee > 0 ? `
        <tr class="row-alt">
          <td>${language === 'my' ? 'မိတ်ဖက် ကော်မရှင်ခ (Partner Commission)' : 'Partner Commission'}:</td>
          <td class="val">${transaction.commissionFee.toLocaleString()} MMK</td>
        </tr>` : ''}
        <tr class="total-row">
          <td>${language === 'my' ? 'လက်ခံရရှိငွေ စုစုပေါင်း (Total Payout / Receive Amount)' : 'Total Payout / Receive Amount'}:</td>
          <td class="val">${transaction.receiveAmount.toLocaleString()} ${transaction.targetCurrency}</td>
        </tr>
      </tbody>
    </table>

    <!-- Additional Details -->
    <div class="details-box">
      <div>
        <strong>${language === 'my' ? 'လွှဲပို့ရည်ရွယ်ချက်' : 'Purpose'}:</strong> ${transaction.purposeName}
      </div>
      <div>
        <strong>${language === 'my' ? 'ငွေထုတ်ယူနည်း' : 'Payout Method'}:</strong> ${payoutMethodText}
      </div>
      ${partner ? `
      <div style="grid-column: 1 / -1;">
        <strong>${language === 'my' ? 'မိတ်ဖက် ကွန်ရက်' : 'Partner Channel'}:</strong> ${partner.nameEn} (${partner.swiftCode || partner.code})
      </div>` : ''}
      ${transaction.senderNote ? `
      <div style="grid-column: 1 / -1; font-style: italic;">
        <strong>${language === 'my' ? 'မှတ်ချက်' : 'Note'}:</strong> "${transaction.senderNote}"
      </div>` : ''}
    </div>

    <!-- Signatures & Stamp -->
    <div class="sig-grid">
      <div>
        <div class="sig-line"></div>
        <div class="sig-name">${transaction.creatorName || (language === 'my' ? 'စာရင်းသွင်းသူ' : 'Maker')}</div>
        <div class="sig-title">${language === 'my' ? 'စာရင်းသွင်းဝန်ထမ်း (Maker / Operator)' : 'Prepared / Operator'}</div>
      </div>
      <div>
        <div class="sig-line">
          <span class="stamp-box">${language === 'my' ? 'ဘဏ်ခွဲ တံဆိပ်တုံး' : 'Branch Stamp'}</span>
        </div>
        <div class="sig-name">${language === 'my' ? 'ဘဏ်ခွဲ အတည်ပြုတံဆိပ်တုံး' : 'Branch Verification Stamp'}</div>
        <div class="sig-title">${language === 'my' ? 'ဗဟိုဘဏ် စည်းမျဉ်းကိုက်' : 'CBM Compliance'}</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-name">${transaction.approverName || (language === 'my' ? 'အတည်ပြုသူ မန်နေဂျာ' : 'Checker / Manager')}</div>
        <div class="sig-title">${language === 'my' ? 'ခွင့်ပြုအတည်ပြုသူ (Checker Approval)' : 'Authorized Checker Approval'}</div>
      </div>
    </div>

    <!-- Legal footer -->
    <div class="legal-notice">
      ${language === 'my'
        ? 'ဤငွေလွှဲပြောင်းမှုသည် မြန်မာနိုင်ငံတော်ဗဟိုဘဏ်၏ ငွေကြေးခဝါချမှုနှင့် အကြမ်းဖက်မှုကို ငွေကြေးထောက်ပံ့မှု တိုက်ဖျက်ရေး (AML/CFT) ညွှန်ကြားချက်များနှင့်အညီ စိစစ်အတည်ပြုထားပြီး ဖြစ်ပါသည်။'
        : 'This remittance transaction has been screened in compliance with the Central Bank of Myanmar Anti-Money Laundering (AML) & Counter-Terrorism Financing (CFT) guidelines. Beneficiary must present valid original Myanmar NRC for counter collection.'}
    </div>
  </div>

  <script>
    // Auto-trigger print when opened in a dedicated window or tab
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn('Auto print was blocked or ignored:', e);
        }
      }, 350);
    });
  </script>
</body>
</html>`;
}

export function printVoucherDocument(params: {
  transaction: RemittanceTransaction;
  branch: Branch;
  partner?: Company;
  operatorProfile: OperatorProfile;
  language?: Language;
}): { success: boolean; url: string } {
  const html = generateVoucherHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  // Method 1: Try window.open directly
  try {
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      return { success: true, url: blobUrl };
    }
  } catch (err) {
    console.warn('window.open blocked, trying anchor click fallback:', err);
  }

  // Method 2: Anchor click fallback (works through popup blockers)
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 1000);
    return { success: true, url: blobUrl };
  } catch (err) {
    console.warn('Anchor click fallback failed:', err);
  }

  return { success: false, url: blobUrl };
}

export function downloadVoucherHtml(params: {
  transaction: RemittanceTransaction;
  branch: Branch;
  partner?: Company;
  operatorProfile: OperatorProfile;
  language?: Language;
}): void {
  const html = generateVoucherHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Voucher_${params.transaction.mtcn || params.transaction.transactionNo}.html`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

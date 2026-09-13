import React, { useState } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  PauseCircle, 
  Printer, 
  Eye, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  Building2,
  Edit3,
  FileText,
  FileCheck,
  ExternalLink,
  Download,
  Paperclip,
  Upload,
  AlertCircle,
  Maximize2,
  Trash2,
  Sparkles,
  Receipt,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { EditOutwardModal } from './EditOutwardModal';
import { formatToDDMMYYYY } from '../Common/DobDatePicker';
import { DocumentLightboxModal } from '../Common/DocumentLightboxModal';
import { 
  createSampleMyanmarNrcSvg, 
  createSampleMyanmarNrcBackSvg,
  createSampleMyanmarPassportSvg,
  createSampleDepositReceiptSvg
} from '../../lib/sampleDocuments';
import { extractNrcInfoFromUpload, scanNrcWithAi } from '../../lib/nrcOcrParser';

export const OutwardApproveView: React.FC = () => {
  const { 
    db, 
    language, 
    t, 
    approveTransaction, 
    rejectTransaction, 
    holdTransaction, 
    updateTransaction,
    isSyncingTurso,
    syncTursoBidirectional
  } = useRemittance();
  
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<RemittanceTransaction | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherTx, setVoucherTx] = useState<RemittanceTransaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<RemittanceTransaction | null>(null);
  const [lightboxDoc, setLightboxDoc] = useState<{
    isOpen: boolean;
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  } | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; type?: string } | null>(null);

  const outwardTxs = db.transactions.filter(t => t.type === 'OUTWARD');

  const filteredTxs = outwardTxs.filter(tx => {
    if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transactionNo.toLowerCase().includes(q) ||
        tx.mtcn.toLowerCase().includes(q) ||
        tx.senderName.toLowerCase().includes(q) ||
        tx.receiverName.toLowerCase().includes(q) ||
        tx.senderNrc.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenReview = (tx: RemittanceTransaction) => {
    setSelectedTx(tx);
    setApprovalNote('Verified all sender/receiver compliance details and financial records.');
    setShowReviewModal(true);
  };

  const handleOpenEdit = (tx: RemittanceTransaction) => {
    setEditingTx(tx);
    setShowEditModal(true);
  };

  const handleDirectApproveFromEdit = async (updatedTx: RemittanceTransaction) => {
    const success = await approveTransaction(updatedTx.id, 'Approved immediately after Review & Edit');
    if (success) {
      confetti({ particleCount: 70, spread: 60 });
      setVoucherTx(updatedTx);
      setShowVoucherModal(true);
    }
  };

  const handleApprove = async () => {
    if (!selectedTx) return;
    const success = await approveTransaction(selectedTx.id, approvalNote);
    if (success) {
      confetti({ particleCount: 70, spread: 60 });
      setShowReviewModal(false);
      setVoucherTx(selectedTx);
      setShowVoucherModal(true);
    }
  };

  const handleOpenReject = (tx: RemittanceTransaction) => {
    setSelectedTx(tx);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedTx || !rejectionReason.trim()) return;
    await rejectTransaction(selectedTx.id, rejectionReason);
    setShowRejectModal(false);
    setShowReviewModal(false);
  };

  const handleHold = async () => {
    if (!selectedTx) return;
    await holdTransaction(selectedTx.id, approvalNote || 'Placed on hold for KYC verification.');
    setShowReviewModal(false);
  };

  const openLightbox = (doc: {
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  }) => {
    if (!doc.url) return;
    setLightboxDoc({
      isOpen: true,
      ...doc
    });
  };

  const handleQuickAttach = async (type: 'nrc-front' | 'nrc-back' | 'nrc-both' | 'passport' | 'deposit') => {
    if (!selectedTx) return;
    let updated: RemittanceTransaction = { ...selectedTx };

    if (type === 'nrc-front' || type === 'nrc-both') {
      const frontUrl = createSampleMyanmarNrcSvg(
        selectedTx.senderNrc || '12/BAHANA(N)184920',
        selectedTx.senderNameMm || selectedTx.senderName,
        selectedTx.senderName,
        formatToDDMMYYYY(selectedTx.senderDateOfBirth) || '14/07/1988',
        selectedTx.senderFatherName || 'U Tin Aung'
      );
      const frontName = `NRC_Front_${selectedTx.senderName.replace(/\s+/g, '_')}_${(selectedTx.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
      updated = {
        ...updated,
        senderNrcAttachment: frontUrl,
        senderNrcAttachmentName: frontName,
        senderNrcAttachmentType: 'image/svg+xml',
        senderNrcAttachmentSize: '18 KB',
        senderNrcFrontAttachment: frontUrl,
        senderNrcFrontAttachmentName: frontName,
        senderNrcFrontAttachmentType: 'image/svg+xml',
        senderNrcFrontAttachmentSize: '18 KB'
      };
    }

    if (type === 'nrc-back' || type === 'nrc-both') {
      const backUrl = createSampleMyanmarNrcBackSvg(
        selectedTx.senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)',
        selectedTx.senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ရန်ကုန်'
      );
      const backName = `NRC_Back_${selectedTx.senderName.replace(/\s+/g, '_')}_${(selectedTx.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
      updated = {
        ...updated,
        senderNrcBackAttachment: backUrl,
        senderNrcBackAttachmentName: backName,
        senderNrcBackAttachmentType: 'image/svg+xml',
        senderNrcBackAttachmentSize: '16 KB'
      };
    }

    if (type === 'passport') {
      const passUrl = createSampleMyanmarPassportSvg(
        selectedTx.senderPassport || 'MA-918234',
        selectedTx.senderName,
        formatToDDMMYYYY(selectedTx.senderDateOfBirth) || '14/07/1988'
      );
      const passName = `Passport_${selectedTx.senderName.replace(/\s+/g, '_')}_${selectedTx.senderPassport || 'MA918234'}.svg`;
      updated = {
        ...updated,
        senderPassportAttachment: passUrl,
        senderPassportAttachmentName: passName,
        senderPassportAttachmentType: 'image/svg+xml',
        senderPassportAttachmentSize: '24 KB',
        senderPassbookAttachment: passUrl,
        senderPassbookAttachmentName: passName,
        senderPassbookAttachmentType: 'image/svg+xml',
        senderPassbookAttachmentSize: '24 KB'
      };
    }

    if (type === 'deposit') {
      const curBranch = db.branches.find(b => b.id === selectedTx.sendingBranchId) || db.branches[0];
      const depositUrl = createSampleDepositReceiptSvg(
        selectedTx.senderName,
        selectedTx.senderNrc || '12/BAHANA(N)184920',
        `${selectedTx.sendAmount?.toLocaleString()} ${selectedTx.sendCurrency}`,
        curBranch?.nameEn || 'Yangon Main Branch',
        selectedTx.date ? formatToDDMMYYYY(selectedTx.date) : '07/09/2026'
      );
      const depositName = `Deposit_Receipt_${selectedTx.transactionNo || Date.now().toString().slice(-4)}.svg`;
      updated = {
        ...updated,
        proofDocumentUrl: depositUrl,
        proofDocumentName: depositName,
        proofDocumentType: 'image/svg+xml',
        proofDocumentSize: '21 KB',
        proofDocCategory: 'DEPOSIT_RECEIPT'
      };
    }

    await updateTransaction(updated, `Attached sample ${type} document in Outward Approval Queue`);
    setSelectedTx(updated);
    setUploadFeedback({
      message: language === 'my'
        ? `နမူနာ အထောက်အထားစာရွက်စာတမ်း အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Attached sample document successfully`,
      type: 'general'
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'nrc-front' | 'nrc-back' | 'nrc' | 'passport' | 'deposit' | 'custom'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTx) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      let updated: RemittanceTransaction = { ...selectedTx };

      if (type === 'nrc-front' || type === 'nrc' || type === 'nrc-back') {
        const extracted = extractNrcInfoFromUpload(file, dataUrl, db.customers);
        updated = {
          ...updated,
          senderName: extracted.nameEn || updated.senderName,
          senderNameMm: extracted.nameMm || updated.senderNameMm,
          senderNrc: extracted.nrcNumber || updated.senderNrc,
          senderFatherName: extracted.fatherName || updated.senderFatherName,
          senderDateOfBirth: extracted.dob || updated.senderDateOfBirth,
          senderAddress: extracted.address || updated.senderAddress,
          senderOccupation: extracted.occupation || updated.senderOccupation,
          ...(type === 'nrc-back' ? {
            senderNrcBackAttachment: dataUrl,
            senderNrcBackAttachmentName: file.name,
            senderNrcBackAttachmentType: file.type || 'image/jpeg',
            senderNrcBackAttachmentSize: sizeStr
          } : {
            senderNrcAttachment: dataUrl,
            senderNrcAttachmentName: file.name,
            senderNrcAttachmentType: file.type || 'image/jpeg',
            senderNrcAttachmentSize: sizeStr,
            senderNrcFrontAttachment: dataUrl,
            senderNrcFrontAttachmentName: file.name,
            senderNrcFrontAttachmentType: file.type || 'image/jpeg',
            senderNrcFrontAttachmentSize: sizeStr
          })
        };
        await updateTransaction(updated, `Uploaded NRC: Auto-extracted ${extracted.nameEn || updated.senderName} (${extracted.nrcNumber || updated.senderNrc})`);
        setSelectedTx(updated);
        setUploadFeedback({
          message: language === 'my'
            ? `✨ မှတ်ပုံတင် ဖိုင်တင်သွင်းပြီးသည်နှင့် အမည် (${extracted.nameEn || extracted.nameMm || updated.senderName}) နှင့် မှတ်ပုံတင်နံပတ် (${extracted.nrcNumber || updated.senderNrc}) အား Auto တန်းဖတ်ရှုပြီး မှတ်တမ်းတွင် ဖြည့်သွင်းပြင်ဆင်လိုက်ပါပြီ`
            : `✨ Auto-extracted Name (${extracted.nameEn || updated.senderName}) & NRC (${extracted.nrcNumber || updated.senderNrc}) upon upload!`,
          type: 'general'
        });

        // Asynchronous AI Vision OCR
        scanNrcWithAi(file, dataUrl, db.customers).then(async (aiExtracted) => {
          if (selectedTx) {
            const aiUpdated: RemittanceTransaction = {
              ...selectedTx,
              senderName: aiExtracted.nameEn || selectedTx.senderName,
              senderNameMm: aiExtracted.nameMm || selectedTx.senderNameMm,
              senderNrc: aiExtracted.nrcNumber || selectedTx.senderNrc,
              senderFatherName: aiExtracted.fatherName || selectedTx.senderFatherName,
              senderDateOfBirth: aiExtracted.dob || selectedTx.senderDateOfBirth,
              senderAddress: aiExtracted.address || selectedTx.senderAddress,
              senderOccupation: aiExtracted.occupation || selectedTx.senderOccupation,
            };
            await updateTransaction(aiUpdated, `AI OCR Refinement: ${aiExtracted.nameEn || aiUpdated.senderName} (${aiExtracted.nrcNumber || aiUpdated.senderNrc})`);
            setSelectedTx(aiUpdated);
          }
        }).catch(() => {});

        setTimeout(() => setUploadFeedback(null), 7000);
        return;
      } else if (type === 'deposit' || type === 'custom') {
        updated = {
          ...updated,
          proofDocumentUrl: dataUrl,
          proofDocumentName: file.name,
          proofDocumentType: file.type || 'image/jpeg',
          proofDocumentSize: sizeStr,
          proofDocCategory: type === 'deposit' ? 'DEPOSIT_RECEIPT' : 'OTHER'
        };
      }

      await updateTransaction(updated, `Uploaded ${type} file: ${file.name}`);
      setSelectedTx(updated);
      setUploadFeedback({
        message: language === 'my'
          ? `ပုံအသစ် အောင်မြင်စွာ အစားထိုးထည့်သွင်းပြီးပါပြီ (${file.name})`
          : `Successfully replaced old picture with new file (${file.name})`,
        type: 'general'
      });
      setTimeout(() => setUploadFeedback(null), 6000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = async (
    type: 'nrc-front' | 'nrc-back' | 'nrc' | 'passport' | 'deposit'
  ) => {
    if (!selectedTx) return;
    let updated: RemittanceTransaction = { ...selectedTx };

    if (type === 'nrc-front' || type === 'nrc') {
      updated = {
        ...updated,
        senderNrcAttachment: undefined,
        senderNrcAttachmentName: undefined,
        senderNrcAttachmentType: undefined,
        senderNrcAttachmentSize: undefined,
        senderNrcFrontAttachment: undefined,
        senderNrcFrontAttachmentName: undefined,
        senderNrcFrontAttachmentType: undefined,
        senderNrcFrontAttachmentSize: undefined
      };
    } else if (type === 'nrc-back') {
      updated = {
        ...updated,
        senderNrcBackAttachment: undefined,
        senderNrcBackAttachmentName: undefined,
        senderNrcBackAttachmentType: undefined,
        senderNrcBackAttachmentSize: undefined
      };
    } else if (type === 'passport') {
      updated = {
        ...updated,
        senderPassportAttachment: undefined,
        senderPassportAttachmentName: undefined,
        senderPassportAttachmentType: undefined,
        senderPassportAttachmentSize: undefined,
        senderPassbookAttachment: undefined,
        senderPassbookAttachmentName: undefined,
        senderPassbookAttachmentType: undefined,
        senderPassbookAttachmentSize: undefined
      };
    } else if (type === 'deposit') {
      updated = {
        ...updated,
        proofDocumentUrl: undefined,
        proofDocumentName: undefined,
        proofDocumentType: undefined,
        proofDocumentSize: undefined,
        proofDocCategory: undefined
      };
    }

    await updateTransaction(updated, `Removed ${type} attachment`);
    setSelectedTx(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.outwardApproveTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.approveListSubtitle}
          </p>
        </div>

        {/* Filter Tabs & Cloud Sync */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('PENDING_APPROVAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'PENDING_APPROVAL' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'my' ? 'စိစစ်ရန်ကျန်' : 'Pending'} ({outwardTxs.filter(t => t.status === 'PENDING_APPROVAL').length})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'APPROVED' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'my' ? 'အတည်ပြုပြီး' : 'Approved'}
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.all}
            </button>
          </div>

          {/* Turso Cloud Live Sync Button */}
          <button
            onClick={() => syncTursoBidirectional()}
            disabled={isSyncingTurso}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-xs"
            title={language === 'my' ? 'Turso Cloud မှ စာရင်းအသစ်များ ရယူရန် / Refresh လုပ်ရန် နှိပ်ပါ' : 'Fetch latest transactions from Turso Cloud'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTurso ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{isSyncingTurso ? (language === 'my' ? 'Sync လုပ်နေသည်...' : 'Syncing...') : (language === 'my' ? 'Cloud Sync' : 'Sync Cloud')}</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'my' ? 'MTCN၊ အမှတ်စဉ်၊ ပို့သူ/လက်ခံသူ အမည်ဖြင့် ရှာရန်...' : 'Search by MTCN, Tx No, Sender/Receiver...'}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          {filteredTxs.length} {language === 'my' ? 'ခု တွေ့ရှိပါသည်' : 'transactions found'}
        </div>
      </div>

      {/* Transaction List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{t.transactionNo} / MTCN</th>
                <th className="px-4 py-3">{t.senderName}</th>
                <th className="px-4 py-3">{t.receiverName}</th>
                <th className="px-4 py-3">{t.amount} & Exchange</th>
                <th className="px-4 py-3">{t.creator}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-white">{tx.transactionNo}</div>
                      <div className="font-mono text-amber-400 text-[11px]">MTCN: {tx.mtcn}</div>
                      <div className="text-[10px] text-slate-500">{new Date(tx.createdDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.senderName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.senderNrc}</div>

                      {/* Attached NRC or Passport Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {tx.senderNrcAttachment ? (
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် (NRC)' : "Sender's National Registration Card (NRC)",
                              url: tx.senderNrcAttachment,
                              name: tx.senderNrcAttachmentName || 'Sender_NRC.svg',
                              type: tx.senderNrcAttachmentType || 'image/svg+xml',
                              size: tx.senderNrcAttachmentSize || '',
                              idNumber: tx.senderNrc,
                              sender: tx.senderName
                            })}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition-all cursor-pointer group hover:scale-[1.02]"
                            title={language === 'my' ? 'ပူးတွဲမှတ်ပုံတင် ကြည့်မည်' : 'View attached NRC Card'}
                          >
                            <FileText className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span>NRC Attached</span>
                            <Eye className="w-2.5 h-2.5 text-emerald-400/80 ml-0.5 shrink-0" />
                          </button>
                        ) : null}

                        {(tx.senderPassportAttachment || tx.senderPassbookAttachment) ? (
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport Document",
                              url: tx.senderPassportAttachment || tx.senderPassbookAttachment,
                              name: tx.senderPassportAttachmentName || tx.senderPassbookAttachmentName || 'Sender_Passport.svg',
                              type: tx.senderPassportAttachmentType || tx.senderPassbookAttachmentType || 'image/svg+xml',
                              size: tx.senderPassportAttachmentSize || tx.senderPassbookAttachmentSize || '',
                              idNumber: tx.senderPassport,
                              sender: tx.senderName
                            })}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[10px] font-semibold transition-all cursor-pointer group hover:scale-[1.02]"
                            title={language === 'my' ? 'ပူးတွဲနိုင်ငံကူးလက်မှတ် ကြည့်မည်' : 'View attached Passport Document'}
                          >
                            <FileCheck className="w-3 h-3 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span>Passport Attached</span>
                            <Eye className="w-2.5 h-2.5 text-sky-400/80 ml-0.5 shrink-0" />
                          </button>
                        ) : null}

                        {!tx.senderNrcAttachment && !tx.senderPassportAttachment && !tx.senderPassbookAttachment && (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-slate-500 italic py-0.5">
                            <AlertCircle className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span>No doc attached</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.receiverName}</div>
                      <div className="text-[11px] text-slate-400">Destination: {tx.receiverCountryCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-emerald-400">
                        {Number(tx.sendAmount || 0).toLocaleString()} {tx.sourceCurrency}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ➔ {Number(tx.receiveAmount || 0).toLocaleString()} {tx.targetCurrency}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-300 font-medium">{tx.creatorName}</div>
                      <div className="flex items-center space-x-1 text-[10px] text-sky-400 font-mono mt-0.5">
                        <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>{db.branches.find(b => b.id === tx.sendingBranchId)?.nameEn || tx.sendingBranchId || 'Yangon HQ'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{tx.purposeName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'APPROVED' || tx.status === 'PAID_OUT'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : tx.status === 'ON_HOLD'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {tx.status === 'PENDING_APPROVAL' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(tx)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold text-xs transition-all flex items-center space-x-1 hover:scale-[1.02] cursor-pointer shadow-xs"
                              title={language === 'my' ? 'ငွေလွှဲအချက်အလက် စိစစ်ပြင်ဆင်ရန်' : 'Review & Edit Details'}
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>{language === 'my' ? 'Review & Edit' : 'Review & Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReview(tx)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-colors flex items-center space-x-1 cursor-pointer"
                              title={t.review}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>{t.review}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setVoucherTx(tx);
                              setShowVoucherModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title={t.printVoucher}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checker Review Modal */}
      {showReviewModal && selectedTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {language === 'my' ? 'ငွေလွှဲပို့မှု စိစစ်အတည်ပြုခြင်း (Checker Review)' : 'Outward Remittance Approval Review'}
                </h3>
              </div>
              <span className="font-mono text-xs text-amber-400 font-bold">{selectedTx.transactionNo}</span>
            </div>

            {/* Quick overview grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">{t.senderName}:</span>
                <strong className="text-slate-200 text-sm">{selectedTx.senderName}</strong>
                <p className="text-[11px] text-slate-400 font-mono">{selectedTx.senderNrc}</p>
                <p className="text-[11px] text-slate-400">{selectedTx.senderPhone}</p>
                {selectedTx.senderDateOfBirth && (
                  <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1 mt-0.5">
                    <span className="text-slate-500">DOB:</span>
                    <span>{formatToDDMMYYYY(selectedTx.senderDateOfBirth)}</span>
                  </p>
                )}
              </div>

              <div>
                <span className="text-slate-400 block font-medium">{t.receiverName}:</span>
                <strong className="text-slate-200 text-sm">{selectedTx.receiverName}</strong>
                <p className="text-[11px] text-slate-400">Destination: {selectedTx.receiverCountryCode}</p>
                <p className="text-[11px] text-slate-400">{selectedTx.receiverPhone}</p>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <span className="text-slate-400 block font-medium">{t.sendAmount}:</span>
                <strong className="text-emerald-400 text-sm font-mono">
                  {Number(selectedTx.sendAmount || 0).toLocaleString()} {selectedTx.sourceCurrency}
                </strong>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <span className="text-slate-400 block font-medium">{t.receiveAmount}:</span>
                <strong className="text-emerald-400 text-sm font-mono">
                  {Number(selectedTx.receiveAmount || 0).toLocaleString()} {selectedTx.targetCurrency}
                </strong>
              </div>
            </div>

            {/* Sender Identity Document Verification (NRC Front & Back, Passport, Deposit Slip) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    {language === 'my' 
                      ? 'ငွေလွှဲစိစစ်ရန် မူရင်း မှတ်ပုံတင် (NRC) / နိုင်ငံကူးလက်မှတ် / ငွေသွင်းပြေစာ ပူးတွဲဖိုင်များ' 
                      : "Sender Identity & Compliance Documents Verification"}
                  </span>
                </div>
                
                {/* Status indicator */}
                <div className="flex items-center space-x-2">
                  {(selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) && selectedTx.senderNrcBackAttachment ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'NRC ရှေ့/နောက် ပြည့်စုံစွာ ပူးတွဲပြီး' : 'NRC Front & Back Attached'}
                    </span>
                  ) : (selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'NRC အရှေ့ခြမ်း ပူးတွဲပြီး' : 'NRC Front Attached'}
                    </span>
                  ) : (selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'Passport ပူးတွဲပြီး' : 'Passport Attached'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      ⚠ {language === 'my' ? 'စာရွက်စာတမ်း မပူးတွဲရသေးပါ' : 'No Attachment Uploaded'}
                    </span>
                  )}
                  {selectedTx.proofDocumentUrl && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'ငွေသွင်းပြေစာ ပူးတွဲပြီး' : 'Deposit Slip Attached'}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Attach Presets Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'my' ? 'နမူနာ အမြန်တွဲရန်:' : 'Quick Presets:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickAttach('nrc-both')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Generate both Front and Back NRC cards"
                >
                  <span>+ {language === 'my' ? 'NRC ရှေ့/နောက် နှစ်ဖက်လုံး နမူနာတွဲမည်' : 'Attach Both NRC Front & Back'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAttach('passport')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Generate Passport document"
                >
                  <span>+ {language === 'my' ? 'Passport နမူနာတွဲမည်' : 'Attach Sample Passport'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAttach('deposit')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Generate Bank Deposit Slip voucher"
                >
                  <span>+ {language === 'my' ? 'ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူတွဲမည်' : 'Attach Sample Deposit Slip'}</span>
                </button>
              </div>

              {/* Instructional Banner on How to Replace Pictures */}
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300">
                    {language === 'my' ? 'ပုံဟောင်းအား ပုံအသစ်ဖြင့် အစားထိုးလိုပါက:' : 'How to replace with new picture:'}
                  </span>{' '}
                  <span>
                    {language === 'my' 
                      ? 'သက်ဆိုင်ရာ ကတ်ပေါ်ရှိ စိမ်းပြာရောင် "ပုံအသစ် အစားထိုးတင်မည် (Replace Picture)" ခလုတ်ကို နှိပ်၍ မိမိစက်တွင်းမှ ဓာတ်ပုံအသစ်ကို ရွေးချယ်နိုင်ပါသည်။ ချက်ချင်း အလိုအလျောက် အစားထိုး အတည်ပြုသွားပါမည်။'
                      : 'Click the prominent "Replace Picture" button on any card below to select and upload your new file. It will instantly replace the existing picture.'}
                  </span>
                </div>
              </div>

              {/* Upload & Replace Feedback Banner */}
              {uploadFeedback && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{uploadFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFeedback(null)}
                    className="text-emerald-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. NRC Front Side Card */}
                {(selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) ? (
                  <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            {language === 'my' ? 'NRC အရှေ့ခြမ်း (Front)' : 'NRC Card (Front Side)'}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono font-semibold">
                            {selectedTx.senderNrc || '12/BAHANA(N)184920'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <label
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-colors cursor-pointer hover:scale-105 active:scale-95"
                          title={language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'nrc-front')}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment('nrc-front')}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md cursor-pointer"
                          title={language === 'my' ? 'ဖိုင် ဖယ်ရှားမည်' : 'Remove Front NRC'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail preview with hover zoom */}
                    <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/9] flex items-center justify-center">
                      <img
                        src={selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment}
                        alt="Sender NRC Front"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် အရှေ့ခြမ်း' : "Sender's NRC Card (Front)",
                            url: selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment,
                            name: selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName || 'Sender_NRC_Front.svg',
                            type: selectedTx.senderNrcFrontAttachmentType || selectedTx.senderNrcAttachmentType || 'image/svg+xml',
                            size: selectedTx.senderNrcFrontAttachmentSize || selectedTx.senderNrcAttachmentSize || '',
                            idNumber: selectedTx.senderNrc,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3 text-emerald-400" />
                          <span>{language === 'my' ? 'အကြီးကြည့်' : 'Enlarge'}</span>
                        </button>
                        <label className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold border border-emerald-400/50 transition-colors cursor-pointer shadow-sm">
                          <Upload className="w-3 h-3" />
                          <span>{language === 'my' ? 'ပုံအသစ်တင်' : 'Replace Pic'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'nrc-front')}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px] font-mono" title={selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName}>
                          {selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName || 'NRC_Front.svg'}
                        </span>
                        <span className="text-emerald-400/80 font-mono font-bold">
                          {selectedTx.senderNrcFrontAttachmentSize || selectedTx.senderNrcAttachmentSize || '18 KB'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် အရှေ့ခြမ်း' : "Sender's NRC Card (Front)",
                            url: selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment,
                            name: selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName || 'Sender_NRC_Front.svg',
                            type: selectedTx.senderNrcFrontAttachmentType || selectedTx.senderNrcAttachmentType || 'image/svg+xml',
                            size: selectedTx.senderNrcFrontAttachmentSize || selectedTx.senderNrcAttachmentSize || '',
                            idNumber: selectedTx.senderNrc,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{language === 'my' ? 'ကြည့်ရှု' : 'View'}</span>
                        </button>

                        {/* PROMINENT REPLACE BUTTON */}
                        <label className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 text-[11px] font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'nrc-front')}
                          />
                        </label>

                        <a
                          href={selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment}
                          download={selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName || 'Sender_NRC_Front.svg'}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Download NRC Front"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-dashed border-slate-700/80 rounded-xl p-3 flex flex-col justify-between items-center text-center space-y-2 min-h-[160px]">
                    <div className="flex flex-col items-center space-y-1 mt-2">
                      <FileText className="w-6 h-6 text-slate-500" />
                      <div className="text-xs font-bold text-slate-400">
                        {language === 'my' ? 'NRC အရှေ့ခြမ်း မရှိပါ' : 'No NRC Front Attached'}
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-[180px]">
                        {language === 'my' ? 'ငွေလွှဲသူ၏ မှတ်ပုံတင် အရှေ့ခြမ်း ပုံတင်ပါ' : 'Upload front side of sender NRC'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleQuickAttach('nrc-front')}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        <span>+ {language === 'my' ? 'နမူနာ အရှေ့ခြမ်းတွဲ' : 'Attach Front'}</span>
                      </button>
                      <label className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all shadow-xs cursor-pointer hover:scale-105">
                        <Upload className="w-3 h-3" />
                        <span>{language === 'my' ? 'အရှေ့ခြမ်း ပုံတင်မည်' : 'Upload Front'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.svg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'nrc-front')}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* 2. NRC Back Side Card */}
                {selectedTx.senderNrcBackAttachment ? (
                  <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            {language === 'my' ? 'NRC အနောက်ခြမ်း (Back)' : 'NRC Card (Back Side)'}
                          </div>
                          <div className="text-[10px] text-rose-300 font-mono font-semibold">
                            {language === 'my' ? 'လိပ်စာ/လက်ဗွေခြမ်း' : 'Residence & Fingerprint'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <label
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-colors cursor-pointer hover:scale-105 active:scale-95"
                          title={language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'nrc-back')}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment('nrc-back')}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md cursor-pointer"
                          title={language === 'my' ? 'ဖိုင် ဖယ်ရှားမည်' : 'Remove Back NRC'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail preview with hover zoom */}
                    <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/9] flex items-center justify-center">
                      <img
                        src={selectedTx.senderNrcBackAttachment}
                        alt="Sender NRC Back"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် အနောက်ခြမ်း' : "Sender's NRC Card (Back Side)",
                            url: selectedTx.senderNrcBackAttachment,
                            name: selectedTx.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg',
                            type: selectedTx.senderNrcBackAttachmentType || 'image/svg+xml',
                            size: selectedTx.senderNrcBackAttachmentSize || '',
                            idNumber: selectedTx.senderNrc,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3 text-rose-400" />
                          <span>{language === 'my' ? 'အကြီးကြည့်' : 'Enlarge'}</span>
                        </button>
                        <label className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold border border-emerald-400/50 transition-colors cursor-pointer shadow-sm">
                          <Upload className="w-3 h-3" />
                          <span>{language === 'my' ? 'ပုံအသစ်တင်' : 'Replace Pic'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'nrc-back')}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px] font-mono" title={selectedTx.senderNrcBackAttachmentName}>
                          {selectedTx.senderNrcBackAttachmentName || 'NRC_Back.svg'}
                        </span>
                        <span className="text-rose-400/80 font-mono font-bold">
                          {selectedTx.senderNrcBackAttachmentSize || '16 KB'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် အနောက်ခြမ်း' : "Sender's NRC Card (Back Side)",
                            url: selectedTx.senderNrcBackAttachment,
                            name: selectedTx.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg',
                            type: selectedTx.senderNrcBackAttachmentType || 'image/svg+xml',
                            size: selectedTx.senderNrcBackAttachmentSize || '',
                            idNumber: selectedTx.senderNrc,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{language === 'my' ? 'ကြည့်ရှု' : 'View'}</span>
                        </button>

                        {/* PROMINENT REPLACE BUTTON */}
                        <label className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 text-[11px] font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'nrc-back')}
                          />
                        </label>

                        <a
                          href={selectedTx.senderNrcBackAttachment}
                          download={selectedTx.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg'}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Download NRC Back"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-dashed border-slate-700/80 rounded-xl p-3 flex flex-col justify-between items-center text-center space-y-2 min-h-[160px]">
                    <div className="flex flex-col items-center space-y-1 mt-2">
                      <FileText className="w-6 h-6 text-slate-500" />
                      <div className="text-xs font-bold text-slate-400">
                        {language === 'my' ? 'NRC အနောက်ခြမ်း မရှိပါ' : 'No NRC Back Attached'}
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-[180px]">
                        {language === 'my' ? 'ငွေလွှဲသူ၏ မှတ်ပုံတင် အနောက်ခြမ်း ပုံတင်ပါ' : 'Upload back side of sender NRC'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleQuickAttach('nrc-back')}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        <span>+ {language === 'my' ? 'နမူနာ အနောက်ခြမ်းတွဲ' : 'Attach Back'}</span>
                      </button>
                      <label className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all shadow-xs cursor-pointer hover:scale-105">
                        <Upload className="w-3 h-3" />
                        <span>{language === 'my' ? 'အနောက်ခြမ်း ပုံတင်မည်' : 'Upload Back'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.svg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'nrc-back')}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. Passport Document Card */}
                {(selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment) ? (
                  <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-3 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport Document'}
                          </div>
                          <div className="text-[10px] text-sky-400 font-mono font-semibold">
                            {selectedTx.senderPassport || 'MA-918234'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <label
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold transition-colors cursor-pointer hover:scale-105 active:scale-95"
                          title={language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'passport')}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment('passport')}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md cursor-pointer"
                          title={language === 'my' ? 'ဖိုင် ဖယ်ရှားမည်' : 'Remove Passport attachment'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail preview with hover zoom */}
                    <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/9] flex items-center justify-center">
                      <img
                        src={selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment}
                        alt="Sender Passport Document"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport Document",
                            url: selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment,
                            name: selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName || 'Sender_Passport.svg',
                            type: selectedTx.senderPassportAttachmentType || selectedTx.senderPassbookAttachmentType || 'image/svg+xml',
                            size: selectedTx.senderPassportAttachmentSize || selectedTx.senderPassbookAttachmentSize || '',
                            idNumber: selectedTx.senderPassport,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3 text-sky-400" />
                          <span>{language === 'my' ? 'အကြီးကြည့်' : 'Enlarge'}</span>
                        </button>
                        <label className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold border border-sky-400/50 transition-colors cursor-pointer shadow-sm">
                          <Upload className="w-3 h-3" />
                          <span>{language === 'my' ? 'ပုံအသစ်တင်' : 'Replace Pic'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'passport')}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px] font-mono" title={selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName}>
                          {selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName || 'Sender_Passport.svg'}
                        </span>
                        <span className="text-sky-400/80 font-mono font-bold">
                          {selectedTx.senderPassportAttachmentSize || selectedTx.senderPassbookAttachmentSize || '24 KB'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport Document",
                            url: selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment,
                            name: selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName || 'Sender_Passport.svg',
                            type: selectedTx.senderPassportAttachmentType || selectedTx.senderPassbookAttachmentType || 'image/svg+xml',
                            size: selectedTx.senderPassportAttachmentSize || selectedTx.senderPassbookAttachmentSize || '',
                            idNumber: selectedTx.senderPassport,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{language === 'my' ? 'ကြည့်ရှု' : 'View'}</span>
                        </button>

                        {/* PROMINENT REPLACE BUTTON */}
                        <label className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/50 text-[11px] font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'passport')}
                          />
                        </label>

                        <a
                          href={selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment}
                          download={selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName || 'Sender_Passport.svg'}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Download Passport file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-dashed border-slate-700/80 rounded-xl p-3 flex flex-col justify-between items-center text-center space-y-2 min-h-[160px]">
                    <div className="flex flex-col items-center space-y-1 mt-2">
                      <FileCheck className="w-6 h-6 text-slate-500" />
                      <div className="text-xs font-bold text-slate-400">
                        {language === 'my' ? 'Passport မရှိပါ' : 'No Passport Attached'}
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-[180px]">
                        {language === 'my' ? 'စိစစ်ရန်အတွက် ငွေလွှဲသူ၏ Passport ပူးတွဲနိုင်ပါသည်' : 'Attach sender Passport to verify identity'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleQuickAttach('passport')}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        <span>+ {language === 'my' ? 'နမူနာ Passport' : 'Sample Passport'}</span>
                      </button>
                      <label className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] transition-all shadow-xs cursor-pointer hover:scale-105">
                        <Upload className="w-3 h-3" />
                        <span>{language === 'my' ? 'Passport တင်မည်' : 'Upload Passport'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.svg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'passport')}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* 4. Deposit Slip / Remittance Proof Document Card */}
                {selectedTx.proofDocumentUrl ? (
                  <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            {language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip)' : 'Cash Deposit Receipt'}
                          </div>
                          <div className="text-[10px] text-amber-300 font-mono font-semibold">
                            {selectedTx.sendAmount?.toLocaleString()} {selectedTx.sourceCurrency || selectedTx.sendCurrency}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <label
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-colors cursor-pointer hover:scale-105 active:scale-95"
                          title={language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'deposit')}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment('deposit')}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md cursor-pointer"
                          title={language === 'my' ? 'ဖိုင် ဖယ်ရှားမည်' : 'Remove Deposit Receipt'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail preview with hover zoom */}
                    <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/9] flex items-center justify-center">
                      <img
                        src={selectedTx.proofDocumentUrl}
                        alt="Deposit Receipt"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ မူရင်း (Deposit Receipt)' : "Remittance Cash Deposit Receipt",
                            url: selectedTx.proofDocumentUrl,
                            name: selectedTx.proofDocumentName || 'Deposit_Receipt.svg',
                            type: selectedTx.proofDocumentType || 'image/svg+xml',
                            size: selectedTx.proofDocumentSize || '',
                            idNumber: selectedTx.transactionNo,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3 text-amber-400" />
                          <span>{language === 'my' ? 'အကြီးကြည့်' : 'Enlarge'}</span>
                        </button>
                        <label className="inline-flex items-center space-x-1 py-1 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold border border-amber-400/50 transition-colors cursor-pointer shadow-sm">
                          <Upload className="w-3 h-3" />
                          <span>{language === 'my' ? 'ပုံအသစ်တင်' : 'Replace Pic'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'deposit')}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px] font-mono" title={selectedTx.proofDocumentName}>
                          {selectedTx.proofDocumentName || 'Deposit_Receipt.svg'}
                        </span>
                        <span className="text-amber-400/80 font-mono font-bold">
                          {selectedTx.proofDocumentSize || '21 KB'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ မူရင်း (Deposit Receipt)' : "Remittance Cash Deposit Receipt",
                            url: selectedTx.proofDocumentUrl,
                            name: selectedTx.proofDocumentName || 'Deposit_Receipt.svg',
                            type: selectedTx.proofDocumentType || 'image/svg+xml',
                            size: selectedTx.proofDocumentSize || '',
                            idNumber: selectedTx.transactionNo,
                            sender: selectedTx.senderName
                          })}
                          className="inline-flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{language === 'my' ? 'ကြည့်ရှု' : 'View'}</span>
                        </button>

                        {/* PROMINENT REPLACE BUTTON */}
                        <label className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/50 text-[11px] font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === 'my' ? 'ပုံအသစ် အစားထိုးတင်မည်' : 'Replace Picture'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'deposit')}
                          />
                        </label>

                        <a
                          href={selectedTx.proofDocumentUrl}
                          download={selectedTx.proofDocumentName || 'Deposit_Receipt.svg'}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Download Deposit Receipt"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-dashed border-slate-700/80 rounded-xl p-3 flex flex-col justify-between items-center text-center space-y-2 min-h-[160px]">
                    <div className="flex flex-col items-center space-y-1 mt-2">
                      <Receipt className="w-6 h-6 text-slate-500" />
                      <div className="text-xs font-bold text-slate-400">
                        {language === 'my' ? 'ငွေသွင်းပြေစာ မရှိပါ' : 'No Deposit Slip Attached'}
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-[180px]">
                        {language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (သို့) ငွေလွှဲအထောက်အထား တွဲနိုင်ပါသည်' : 'Attach bank deposit receipt or transaction proof'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleQuickAttach('deposit')}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        <span>+ {language === 'my' ? 'နမူနာ ပြေစာတွဲ' : 'Sample Slip'}</span>
                      </button>
                      <label className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-all shadow-xs cursor-pointer hover:scale-105">
                        <Upload className="w-3 h-3" />
                        <span>{language === 'my' ? 'ပြေစာ တင်မည်' : 'Upload Slip'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.svg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'deposit')}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Identity Verification Checklist */}
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400">{language === 'my' ? 'စိစစ်ချက်များ:' : 'KYC Matches:'}</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedTx.senderName}</span>
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-mono">{selectedTx.senderNrc}</span>
                  </span>
                  {selectedTx.senderDateOfBirth && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="font-mono">DOB: {formatToDDMMYYYY(selectedTx.senderDateOfBirth)}</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {language === 'my' ? 'အထောက်အထားမူရင်းနှင့် ကိုက်ညီမှုရှိမရှိ စစ်ဆေးပါ' : 'Confirm match with physical / scanned ID'}
                </span>
              </div>
            </div>

            {/* Compliance Check Status */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center space-x-2 text-xs text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{t.cleanRecord}</span>
            </div>

            {/* Branch Information */}
            {(() => {
              const b = db.branches.find(br => br.id === selectedTx.sendingBranchId) || db.branches[0];
              if (!b) return null;
              return (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">
                          {language === 'my' && b.nameMm ? `${b.nameMm} (${b.nameEn})` : b.nameEn}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono text-[10px] font-bold">
                          {b.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.address}, {b.city} • Tel: <span className="font-mono text-slate-300">{b.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 shrink-0 border-t sm:border-t-0 pt-1 sm:pt-0 sm:border-l border-slate-800 sm:pl-3">
                    <span className="text-slate-500 block">{language === 'my' ? 'ဘဏ်ခွဲ မန်နေဂျာ' : 'Branch Manager'}</span>
                    <span className="font-bold text-slate-200">{b.managerName}</span>
                  </div>
                </div>
              );
            })()}

            {/* Maker Note */}
            {selectedTx.senderNote && (
              <div className="text-xs bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-bold block">{t.makerNote}:</span>
                <span className="text-slate-200 italic">"{selectedTx.senderNote}"</span>
              </div>
            )}

            {/* Approval Remarks Input */}
            <div className="text-xs">
              <label className="block text-slate-400 mb-1 font-medium">{t.approvalNote}</label>
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Remarks for audit trail..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Modal Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleHold}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  {t.hold}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    handleOpenEdit(selectedTx);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02]"
                  title={language === 'my' ? 'ငွေလွှဲအချက်အလက် ပြင်ဆင်ရန်' : 'Edit Remittance Information'}
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'my' ? 'ပြင်ဆင်ရန် (Review & Edit)' : 'Review & Edit'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    handleOpenReject(selectedTx);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {t.reject}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  {t.approve}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Prompt Modal */}
      {showRejectModal && selectedTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-600 text-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-rose-400">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-bold">{t.reject} - {selectedTx.transactionNo}</h3>
            </div>
            <p className="text-xs text-slate-300">
              {language === 'my' ? 'ငြင်းပယ်ရသည့် အကြောင်းအရင်းကို အသေးစိတ် ထည့်သွင်းပေးပါ (Audit Log တွင် သိမ်းဆည်းမည်)' : 'Please provide the mandatory rejection reason. This will be recorded in compliance audit.'}
            </p>
            <div>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Inconsistent NRC spelling / Unverified overseas tuition invoice"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {t.reject}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Voucher Modal */}
      <VoucherModal
        isOpen={showVoucherModal}
        transaction={voucherTx}
        onClose={() => setShowVoucherModal(false)}
      />

      {/* Edit Outward Modal */}
      <EditOutwardModal
        isOpen={showEditModal}
        transaction={editingTx}
        onClose={() => {
          setShowEditModal(false);
          setEditingTx(null);
        }}
        onApproveDirectly={handleDirectApproveFromEdit}
      />

      {/* Document Lightbox Modal for Sender NRC & Passport */}
      <DocumentLightboxModal
        isOpen={!!lightboxDoc?.isOpen}
        title={lightboxDoc?.title || "Sender Identity Document"}
        documentUrl={lightboxDoc?.url}
        fileName={lightboxDoc?.name}
        fileType={lightboxDoc?.type}
        fileSize={lightboxDoc?.size}
        idNumber={lightboxDoc?.idNumber}
        senderName={lightboxDoc?.sender}
        onClose={() => setLightboxDoc(null)}
      />
    </div>
  );
};

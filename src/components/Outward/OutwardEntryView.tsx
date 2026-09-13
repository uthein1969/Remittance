import React, { useState, useEffect } from 'react';
import { 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  Calculator, 
  UserCheck2, 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Upload,
  User,
  Paperclip,
  MapPin,
  Phone,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileCheck,
  X,
  Maximize2,
  Sparkles,
  Receipt,
  Layers,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceScope, PayoutMethod, RemittanceTransaction, BlacklistEntry } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { DobDatePicker, formatToDDMMYYYY } from '../Common/DobDatePicker';
import { DocumentLightboxModal } from '../Common/DocumentLightboxModal';
import { 
  createSampleMyanmarNrcSvg, 
  createSampleMyanmarNrcBackSvg, 
  createSampleMyanmarPassportSvg,
  createSampleDepositReceiptSvg
} from '../../lib/sampleDocuments';
import { extractNrcInfoFromUpload, scanNrcWithAi, ExtractedNrcInfo } from '../../lib/nrcOcrParser';

export const OutwardEntryView: React.FC = () => {
  const { db, language, t, checkBlacklist, getExchangeRate, createOutwardRemittance, currentUser } = useRemittance();

  // Form State
  const [scope, setScope] = useState<RemittanceScope>('INTERNATIONAL');
  
  // Sender
  const [senderName, setSenderName] = useState('');
  const [senderNameMm, setSenderNameMm] = useState('');
  const [senderIdType, setSenderIdType] = useState<'NRC' | 'PASSPORT'>('NRC');
  const [senderNrc, setSenderNrc] = useState('');
  const [senderPassport, setSenderPassport] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCountryCode, setSenderCountryCode] = useState('MM');
  const [senderFatherName, setSenderFatherName] = useState('U Tin Aung');
  const [senderDateOfBirth, setSenderDateOfBirth] = useState('14/07/1988');
  const [senderOccupation, setSenderOccupation] = useState('Company Staff');
  const [senderSourceOfFund, setSenderSourceOfFund] = useState('Salary / Business Income');

  // Sender Document Attachments
  const [senderNrcFrontDoc, setSenderNrcFrontDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [senderNrcBackDoc, setSenderNrcBackDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [senderPassportDoc, setSenderPassportDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);

  // Receiver
  const [receiverName, setReceiverName] = useState('');
  const [receiverNameMm, setReceiverNameMm] = useState('');
  const [receiverNrc, setReceiverNrc] = useState('');
  const [receiverPassport, setReceiverPassport] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCountryCode, setReceiverCountryCode] = useState('TH');

  // Financials
  const [sourceCurrency, setSourceCurrency] = useState('MMK');
  const [targetCurrency, setTargetCurrency] = useState('THB');
  const [sendAmount, setSendAmount] = useState<number>(5000000);
  const [exchangeRate, setExchangeRate] = useState<number>(134.50);
  const [serviceFee, setServiceFee] = useState<number>(15000);
  const [commissionFee, setCommissionFee] = useState<number>(5000);
  
  // Method & Purpose
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('CASH_PICKUP');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [purposeId, setPurposeId] = useState('PUR-001');
  const [partnerCompanyId, setPartnerCompanyId] = useState('CMP-005');
  const [sendingBranchId, setSendingBranchId] = useState(currentUser.branchId || 'BR-001');
  const [senderNote, setSenderNote] = useState('');
  
  // Purpose & Routing Details: Proof Attachment Category & Documents
  const [proofCategory, setProofCategory] = useState<'NRC' | 'DEPOSIT_RECEIPT' | 'CUSTOM'>('NRC');
  const [proofDocumentName, setProofDocumentName] = useState('');
  const [depositReceiptDoc, setDepositReceiptDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [customProofDoc, setCustomProofDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);

  // Lightbox Preview Modal State
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

  // User notification / feedback banner
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; type?: string } | null>(null);
  const [nrcOcrResult, setNrcOcrResult] = useState<ExtractedNrcInfo | null>(null);
  const [isScanningNrc, setIsScanningNrc] = useState(false);

  // Compliance Screening Matches
  const [senderMatch, setSenderMatch] = useState<BlacklistEntry | null>(null);
  const [receiverMatch, setReceiverMatch] = useState<BlacklistEntry | null>(null);

  // Submission & Voucher preview
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<RemittanceTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Recalculate exchange rate when currencies change
  useEffect(() => {
    const rate = getExchangeRate(targetCurrency, sourceCurrency);
    setExchangeRate(rate);
  }, [sourceCurrency, targetCurrency, getExchangeRate]);

  // Adjust default country and currency when scope changes
  useEffect(() => {
    if (scope === 'DOMESTIC') {
      setReceiverCountryCode('MM');
      setTargetCurrency('MMK');
      setSourceCurrency('MMK');
      setExchangeRate(1);
    } else {
      if (receiverCountryCode === 'MM') {
        setReceiverCountryCode('TH');
        setTargetCurrency('THB');
      }
    }
  }, [scope]);

  // Real-time screening on sender NRC / Passport / Name
  useEffect(() => {
    const match = checkBlacklist(senderNrc, senderPassport, senderName);
    setSenderMatch(match);
  }, [senderNrc, senderPassport, senderName, checkBlacklist]);

  // Real-time screening on receiver NRC / Passport / Name
  useEffect(() => {
    const match = checkBlacklist(receiverNrc, receiverPassport, receiverName);
    setReceiverMatch(match);
  }, [receiverNrc, receiverPassport, receiverName, checkBlacklist]);

  // Calculations
  const calculatedReceiveAmount = sourceCurrency === 'MMK' && targetCurrency !== 'MMK'
    ? (exchangeRate > 0 ? Number((sendAmount / exchangeRate).toFixed(2)) : 0)
    : Number((sendAmount * exchangeRate).toFixed(2));

  const totalPayableAmount = Number(sendAmount) + Number(serviceFee) + Number(commissionFee);

  // Quick fill customer data
  const handleSelectSenderCustomer = (customerId: string) => {
    const cust = db.customers.find(c => c.id === customerId);
    if (cust) {
      setSenderName(cust.fullNameEn);
      setSenderNameMm(cust.fullNameMm || '');
      setSenderNrc(cust.nrcNumber);
      setSenderPassport(cust.passportNumber || cust.passbookNumber || '');
      setSenderPhone(cust.phone);
      setSenderAddress(cust.address);
      if (cust.passportNumber && !cust.nrcNumber) {
        setSenderIdType('PASSPORT');
      } else {
        setSenderIdType('NRC');
      }
    }
  };

  const handleSelectReceiverCustomer = (customerId: string) => {
    const cust = db.customers.find(c => c.id === customerId);
    if (cust) {
      setReceiverName(cust.fullNameEn);
      setReceiverNameMm(cust.fullNameMm || '');
      setReceiverNrc(cust.nrcNumber);
      setReceiverPassport(cust.passportNumber || cust.passbookNumber || '');
      setReceiverPhone(cust.phone);
      setReceiverAddress(cust.address);
    }
  };

  // Helper to generate sample Front NRC
  const handleAttachSampleNrcFront = () => {
    const nrcVal = senderNrc || '12/BAHANA(N)184920';
    const nameMmVal = senderNameMm || 'ဦးဇော်ဝင်းထက်';
    const nameEnVal = senderName || 'U ZAW WIN HTET';
    const dobVal = formatToDDMMYYYY(senderDateOfBirth) || '14/07/1988';
    const fatherVal = senderFatherName || 'U TIN AUNG';
    const url = createSampleMyanmarNrcSvg(nrcVal, nameMmVal, nameEnVal, dobVal, fatherVal);
    const name = `NRC_Front_${nameEnVal.replace(/\s+/g, '_')}_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    const doc = { url, name, type: 'image/svg+xml', size: '18.4 KB' };
    setSenderNrcFrontDoc(doc);
    setProofCategory('NRC');
    setProofDocumentName(name);

    if (!senderName) setSenderName(nameEnVal);
    if (!senderNameMm) setSenderNameMm(nameMmVal);
    if (!senderNrc) setSenderNrc(nrcVal);
    if (!senderFatherName) setSenderFatherName(fatherVal);
    if (!senderDateOfBirth) setSenderDateOfBirth(dobVal);
    setSenderIdType('NRC');

    setNrcOcrResult({
      nameEn: nameEnVal,
      nameMm: nameMmVal,
      nrcNumber: nrcVal,
      fatherName: fatherVal,
      dob: dobVal,
      confidence: 99,
      method: 'SVG_TEXT',
      extractedFields: ['nrcNumber', 'nameEn', 'nameMm', 'fatherName', 'dob']
    });

    setUploadFeedback({
      message: language === 'my'
        ? `✨ မှတ်ပုံတင်မှ အမည် (${nameEnVal}) နှင့် မှတ်ပုံတင်နံပတ် (${nrcVal}) ကို Auto ဖတ်ရှုဖော်ပြပြီးပါပြီ`
        : `✨ Auto-populated Name (${nameEnVal}) and NRC (${nrcVal}) from NRC Card`
    });
    setTimeout(() => setUploadFeedback(null), 6000);
  };

  // Helper to generate sample Back NRC
  const handleAttachSampleNrcBack = () => {
    const occupationVal = senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)';
    const addressVal = senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ဗဟန်းမြို့နယ်၊ ရန်ကုန်';
    const url = createSampleMyanmarNrcBackSvg(occupationVal, addressVal);
    const name = `NRC_Back_${(senderName || 'Sender').replace(/\s+/g, '_')}_${(senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    const doc = { url, name, type: 'image/svg+xml', size: '16.2 KB' };
    setSenderNrcBackDoc(doc);
    setUploadFeedback({
      message: language === 'my'
        ? `မှတ်ပုံတင် အနောက်ခြမ်း (NRC Back) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Successfully attached Sender NRC Card (Back)`
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  // Helper to attach Both Front & Back NRC at once
  const handleAttachBothNrc = () => {
    const nrcVal = senderNrc || '12/BAHANA(N)184920';
    const nameMmVal = senderNameMm || 'ဦးဇော်ဝင်းထက်';
    const nameEnVal = senderName || 'U ZAW WIN HTET';
    const dobVal = formatToDDMMYYYY(senderDateOfBirth) || '14/07/1988';
    const fatherVal = senderFatherName || 'U TIN AUNG';
    const occupationVal = senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)';
    const addressVal = senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ဗဟန်းမြို့နယ်၊ ရန်ကုန်';

    const frontUrl = createSampleMyanmarNrcSvg(nrcVal, nameMmVal, nameEnVal, dobVal, fatherVal);
    const frontName = `NRC_Front_${nameEnVal.replace(/\s+/g, '_')}_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    setSenderNrcFrontDoc({ url: frontUrl, name: frontName, type: 'image/svg+xml', size: '18.4 KB' });

    const backUrl = createSampleMyanmarNrcBackSvg(occupationVal, addressVal);
    const backName = `NRC_Back_${nameEnVal.replace(/\s+/g, '_')}_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    setSenderNrcBackDoc({ url: backUrl, name: backName, type: 'image/svg+xml', size: '16.2 KB' });

    setProofCategory('NRC');
    setProofDocumentName(frontName);

    setSenderName(nameEnVal);
    setSenderNameMm(nameMmVal);
    setSenderNrc(nrcVal);
    if (!senderFatherName) setSenderFatherName(fatherVal);
    if (!senderDateOfBirth) setSenderDateOfBirth(dobVal);
    if (!senderAddress) setSenderAddress(addressVal);
    setSenderIdType('NRC');

    setNrcOcrResult({
      nameEn: nameEnVal,
      nameMm: nameMmVal,
      nrcNumber: nrcVal,
      fatherName: fatherVal,
      dob: dobVal,
      address: addressVal,
      confidence: 99,
      method: 'SVG_TEXT',
      extractedFields: ['nrcNumber', 'nameEn', 'nameMm', 'fatherName', 'dob', 'address']
    });

    setUploadFeedback({
      message: language === 'my'
        ? `✨ မှတ်ပုံတင် (ရှေ့/နောက်) ပူးတွဲပြီး အမည် (${nameEnVal}) နှင့် မှတ်ပုံတင်နံပတ် (${nrcVal}) အား Auto တန်းပြီးဖော်ပြပြီးပါပြီ`
        : `✨ Attached both sides & auto-populated Name (${nameEnVal}) and NRC (${nrcVal})`
    });
    setTimeout(() => setUploadFeedback(null), 7000);
  };

  // Helper to generate sample Passport
  const handleAttachSamplePassport = () => {
    const passNo = senderPassport || 'MA-918234';
    const nameEnVal = senderName || 'U ZAW WIN HTET';
    const dobVal = formatToDDMMYYYY(senderDateOfBirth) || '14/07/1988';
    const url = createSampleMyanmarPassportSvg(passNo, nameEnVal, dobVal);
    const name = `Passport_${(senderName || 'Sender').replace(/\s+/g, '_')}_${passNo}.svg`;
    const doc = { url, name, type: 'image/svg+xml', size: '24.1 KB' };
    setSenderPassportDoc(doc);
    setUploadFeedback({
      message: language === 'my'
        ? `နိုင်ငံကူးလက်မှတ် (Passport) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Successfully attached Sender Passport`
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  // Helper to generate sample Bank Deposit Slip Voucher
  const handleAttachSampleDepositSlip = () => {
    const branch = db.branches.find(b => b.id === sendingBranchId);
    const branchName = branch ? `${branch.nameEn} (${branch.code})` : 'Yangon Main Branch (BR-001)';
    const amountStr = `${sendAmount.toLocaleString()} ${sourceCurrency}`;
    const url = createSampleDepositReceiptSvg(
      senderName || 'U ZAW WIN HTET',
      senderNrc || '12/BAHANA(N)184920',
      amountStr,
      branchName,
      new Date().toLocaleDateString('en-GB')
    );
    const slipName = `Deposit_Slip_${(senderName || 'Sender').replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}.svg`;
    const doc = { url, name: slipName, type: 'image/svg+xml', size: '22.5 KB' };
    setDepositReceiptDoc(doc);
    setProofCategory('DEPOSIT_RECEIPT');
    setProofDocumentName(slipName);
    setUploadFeedback({
      message: language === 'my'
        ? `ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip Voucher) နမူနာ အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Successfully generated and attached Bank Cash Deposit Slip Voucher`
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  // Generic File Upload Handler
  const handleUploadFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'nrc-front' | 'nrc-back' | 'nrc-both' | 'passport' | 'deposit' | 'custom'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const size = `${(file.size / 1024).toFixed(1)} KB`;
      const doc = { url, name: file.name, type: file.type || 'image/jpeg', size };

      if (target === 'nrc-front' || target === 'nrc-both' || target === 'nrc-back') {
        // Step 1: Immediate local smart fill so UI updates instantly
        const localExtracted = extractNrcInfoFromUpload(file, url, db.customers);
        setNrcOcrResult(localExtracted);

        if (localExtracted.nameEn) setSenderName(localExtracted.nameEn);
        if (localExtracted.nameMm) setSenderNameMm(localExtracted.nameMm);
        if (localExtracted.nrcNumber) setSenderNrc(localExtracted.nrcNumber);
        if (localExtracted.fatherName) setSenderFatherName(localExtracted.fatherName);
        if (localExtracted.dob) setSenderDateOfBirth(localExtracted.dob);
        if (localExtracted.address) setSenderAddress(localExtracted.address);
        if (localExtracted.occupation) setSenderOccupation(localExtracted.occupation);
        setSenderIdType('NRC');

        if (target === 'nrc-front' || target === 'nrc-both') {
          setSenderNrcFrontDoc(doc);
          if (target === 'nrc-both') {
            setSenderNrcBackDoc(doc);
          }
          setProofCategory('NRC');
          setProofDocumentName(file.name);
        } else if (target === 'nrc-back') {
          setSenderNrcBackDoc(doc);
          if (!proofDocumentName) setProofDocumentName(file.name);
        }

        if (target === 'nrc-back') {
          setUploadFeedback({
            message: language === 'my'
              ? `✨ NRC အနောက်ခြမ်း ဖိုင်တင်သွင်းပြီးပါပြီ: နေရပ်လိပ်စာ (${localExtracted.address || 'စစ်ဆေးနေပါသည်'}) နှင့် အလုပ်အကိုင် (${localExtracted.occupation || ''}) Auto ဖြည့်သွင်းပေးလိုက်ပါပြီ (${size})`
              : `✨ NRC Back Uploaded: Address (${localExtracted.address || 'Processing...'}) & Occupation (${localExtracted.occupation || ''}) (${size})`
          });
        } else if (localExtracted.nameEn || localExtracted.nrcNumber) {
          setUploadFeedback({
            message: language === 'my'
              ? `✨ မှတ်ပုံတင် ဖိုင်တင်သွင်းပြီးသည်နှင့် အမည် (${localExtracted.nameEn || localExtracted.nameMm || ''}) နှင့် မှတ်ပုံတင်နံပတ် (${localExtracted.nrcNumber || ''}) အား Auto တန်းပြီး ဖြည့်သွင်းဖော်ပြပေးလိုက်ပါပြီ (${size})`
              : `✨ NRC Uploaded: Auto-populated Name (${localExtracted.nameEn || localExtracted.nameMm}) & NRC (${localExtracted.nrcNumber}) (${size})`
          });
        } else {
          setUploadFeedback({
            message: language === 'my'
              ? `✨ NRC ဖိုင် (${file.name}) တင်သွင်းပြီးပါပြီ။ AI Vision OCR ဖြင့် အချက်အလက်များ ဖတ်ရှုနေပါသည်...`
              : `✨ NRC file (${file.name}) uploaded. AI Vision OCR scanning card details...`
          });
        }

        // Step 2: Asynchronous AI Vision OCR scanning via Gemini
        setIsScanningNrc(true);
        scanNrcWithAi(file, url, db.customers).then((aiExtracted) => {
          setIsScanningNrc(false);
          setNrcOcrResult(aiExtracted);
          if (aiExtracted.nameEn) setSenderName(aiExtracted.nameEn);
          if (aiExtracted.nameMm) setSenderNameMm(aiExtracted.nameMm);
          if (aiExtracted.nrcNumber) setSenderNrc(aiExtracted.nrcNumber);
          if (aiExtracted.fatherName) setSenderFatherName(aiExtracted.fatherName);
          if (aiExtracted.dob) setSenderDateOfBirth(aiExtracted.dob);
          if (aiExtracted.address) setSenderAddress(aiExtracted.address);
          if (aiExtracted.occupation) setSenderOccupation(aiExtracted.occupation);

          if (target === 'nrc-back' && aiExtracted.address) {
            setUploadFeedback({
              message: language === 'my'
                ? `✨ AI Vision OCR မှတ်ပုံတင် အနောက်ခြမ်း ဖတ်ရှုပြီးစီးပါပြီ- လိပ်စာ: ${aiExtracted.address}`
                : `✨ AI OCR NRC Back Complete: Address: ${aiExtracted.address}`
            });
          } else if (aiExtracted.nameEn || aiExtracted.nrcNumber) {
            setUploadFeedback({
              message: language === 'my'
                ? `✨ AI Vision OCR မှတ်ပုံတင် ဖတ်ရှုပြီးစီးပါပြီ- ${aiExtracted.nameEn || aiExtracted.nameMm} (${aiExtracted.nrcNumber})`
                : `✨ AI OCR Complete: ${aiExtracted.nameEn || aiExtracted.nameMm} (${aiExtracted.nrcNumber})`
            });
          } else if (aiExtracted.isAiSuccess === false && aiExtracted.error) {
            setUploadFeedback({
              message: language === 'my'
                ? `⚠️ AI OCR အသိပေးချက်: ${aiExtracted.errorMessageMm || aiExtracted.error}`
                : `⚠️ AI OCR Notice: ${aiExtracted.error}`
            });
          }

          if (aiExtracted.confidence >= 80) {
            try {
              confetti({ particleCount: 25, spread: 50, origin: { y: 0.3 } });
            } catch {}
          }
        }).catch((err) => {
          console.warn('AI OCR failed, using local extraction:', err);
          setIsScanningNrc(false);
        });

        setTimeout(() => setUploadFeedback(null), 8000);
        return;
      } else if (target === 'passport') {
        setSenderPassportDoc(doc);
      } else if (target === 'deposit') {
        setDepositReceiptDoc(doc);
        setProofCategory('DEPOSIT_RECEIPT');
        setProofDocumentName(file.name);
      } else if (target === 'custom') {
        setCustomProofDoc(doc);
        setProofCategory('CUSTOM');
        setProofDocumentName(file.name);
      }

      setUploadFeedback({
        message: language === 'my'
          ? `${file.name} ဖိုင်အား အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ (${size})`
          : `File "${file.name}" uploaded successfully (${size})`
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Remove document
  const handleRemoveDoc = (target: 'nrc-front' | 'nrc-back' | 'passport' | 'deposit' | 'custom') => {
    if (target === 'nrc-front') setSenderNrcFrontDoc(null);
    else if (target === 'nrc-back') setSenderNrcBackDoc(null);
    else if (target === 'passport') setSenderPassportDoc(null);
    else if (target === 'deposit') {
      setDepositReceiptDoc(null);
      if (proofCategory === 'DEPOSIT_RECEIPT') setProofDocumentName('');
    } else if (target === 'custom') {
      setCustomProofDoc(null);
      if (proofCategory === 'CUSTOM') setProofDocumentName('');
    }
  };

  // Open Document in Lightbox
  const openLightbox = (params: {
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  }) => {
    if (!params.url) return;
    setLightboxDoc({
      isOpen: true,
      title: params.title,
      url: params.url,
      name: params.name || 'Document_Attachment',
      type: params.type || 'image/svg+xml',
      size: params.size,
      idNumber: params.idNumber || senderNrc || senderPassport,
      sender: params.sender || senderName
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!senderName || !senderPhone) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲပို့သူ အမည်နှင့် ဖုန်းနံပါတ် ဖြည့်စွက်ပါ' : 'Please fill in Sender Name and Phone');
      return;
    }

    if (!receiverName || !receiverPhone) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲလက်ခံသူ အမည်နှင့် ဖုန်းနံပါတ် ဖြည့်စွက်ပါ' : 'Please fill in Receiver Name and Phone');
      return;
    }

    if (sendAmount <= 0) {
      setErrorMessage(language === 'my' ? 'လွှဲပို့ငွေပမာဏ သုညထက် ကြီးရပါမည်' : 'Send amount must be greater than zero');
      return;
    }

    // Hard block if Blacklist Critical
    if (senderMatch && senderMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေလွှဲပို့သူသည် နာမည်ပျက်စာရင်း (${senderMatch.reason}) တွင် ပါဝင်နေသဖြင့် တားမြစ်ထားပါသည်` 
          : `Sender is flagged on CRITICAL Blacklist (${senderMatch.reason}). Submission blocked.`
      );
      return;
    }

    if (receiverMatch && receiverMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေလွှဲလက်ခံသူသည် နာမည်ပျက်စာရင်း (${receiverMatch.reason}) တွင် ပါဝင်နေသဖြင့် တားမြစ်ထားပါသည်` 
          : `Receiver is flagged on CRITICAL Blacklist (${receiverMatch.reason}). Submission blocked.`
      );
      return;
    }

    const selectedPurpose = db.purposes.find(p => p.id === purposeId);

    // Resolve Proof Document details
    let resolvedProofUrl: string | undefined = undefined;
    let resolvedProofName = proofDocumentName;
    let resolvedProofType = 'image/svg+xml';
    let resolvedProofSize: string | undefined = undefined;

    if (proofCategory === 'NRC') {
      resolvedProofUrl = senderNrcFrontDoc?.url;
      resolvedProofName = senderNrcFrontDoc?.name || (senderNrc ? `NRC_Proof_${senderNrc}.svg` : 'NRC_Proof.svg');
      resolvedProofType = senderNrcFrontDoc?.type || 'image/svg+xml';
      resolvedProofSize = senderNrcFrontDoc?.size;
    } else if (proofCategory === 'DEPOSIT_RECEIPT') {
      resolvedProofUrl = depositReceiptDoc?.url;
      resolvedProofName = depositReceiptDoc?.name || (proofDocumentName || 'Deposit_Receipt.svg');
      resolvedProofType = depositReceiptDoc?.type || 'image/svg+xml';
      resolvedProofSize = depositReceiptDoc?.size;
    } else if (proofCategory === 'CUSTOM') {
      resolvedProofUrl = customProofDoc?.url;
      resolvedProofName = customProofDoc?.name || proofDocumentName || 'Supporting_Doc.pdf';
      resolvedProofType = customProofDoc?.type || 'application/pdf';
      resolvedProofSize = customProofDoc?.size;
    }

    setIsSubmitting(true);
    try {
      const newTx = await createOutwardRemittance({
        scope,
        senderName,
        senderNameMm,
        senderIdType,
        senderNrc,
        senderPassport: senderPassport || undefined,
        senderPassbook: senderPassport || undefined,
        senderPhone,
        senderAddress,
        senderCountryCode,
        senderFatherName,
        senderOccupation,
        senderSourceOfFund,
        senderDateOfBirth: formatToDDMMYYYY(senderDateOfBirth) || senderDateOfBirth,
        
        // Attachments
        senderNrcAttachment: senderNrcFrontDoc?.url,
        senderNrcAttachmentName: senderNrcFrontDoc?.name,
        senderNrcAttachmentType: senderNrcFrontDoc?.type,
        senderNrcAttachmentSize: senderNrcFrontDoc?.size,
        senderNrcFrontAttachment: senderNrcFrontDoc?.url,
        senderNrcFrontAttachmentName: senderNrcFrontDoc?.name,
        senderNrcFrontAttachmentType: senderNrcFrontDoc?.type,
        senderNrcFrontAttachmentSize: senderNrcFrontDoc?.size,
        senderNrcBackAttachment: senderNrcBackDoc?.url,
        senderNrcBackAttachmentName: senderNrcBackDoc?.name,
        senderNrcBackAttachmentType: senderNrcBackDoc?.type,
        senderNrcBackAttachmentSize: senderNrcBackDoc?.size,
        senderPassportAttachment: senderPassportDoc?.url,
        senderPassportAttachmentName: senderPassportDoc?.name,
        senderPassportAttachmentType: senderPassportDoc?.type,
        senderPassportAttachmentSize: senderPassportDoc?.size,

        receiverName,
        receiverNameMm,
        receiverNrc,
        receiverPassport: receiverPassport || undefined,
        receiverPassbook: receiverPassport || undefined,
        receiverPhone,
        receiverAddress,
        receiverCountryCode,
        sourceCurrency,
        targetCurrency,
        sendAmount: Number(sendAmount),
        exchangeRate: Number(exchangeRate),
        receiveAmount: Number(calculatedReceiveAmount),
        serviceFee: Number(serviceFee),
        commissionFee: Number(commissionFee),
        totalPayableAmount: Number(totalPayableAmount),
        payoutMethod,
        payoutBankName,
        payoutAccountNumber,
        sendingBranchId,
        partnerCompanyId,
        purposeId,
        purposeName: selectedPurpose ? (language === 'my' ? selectedPurpose.nameMm : selectedPurpose.nameEn) : 'General',
        senderNote,
        proofDocumentName: resolvedProofName || 'Deposit_Receipt_Auto.pdf',
        proofDocumentUrl: resolvedProofUrl,
        proofDocumentType: resolvedProofType,
        proofDocumentSize: resolvedProofSize,
        proofDocCategory: proofCategory,
        status: 'PENDING_APPROVAL',
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setCreatedTx(newTx);

      // Reset form amounts
      setSendAmount(5000000);
      setSenderNote('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit remittance transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Scope selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t.outwardEntryTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.outwardEntrySubtitle}
            </p>
          </div>

          {/* Scope Switch & Active Branch Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>{language === 'my' ? 'ဆောင်ရွက်သည့် ဘဏ်ခွဲ' : 'Sending Branch'}: </span>
              <strong className="text-white font-semibold">
                {db.branches.find(b => b.id === sendingBranchId)?.nameEn || 'Yangon HQ'} ({db.branches.find(b => b.id === sendingBranchId)?.code || sendingBranchId})
              </strong>
            </div>

            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setScope('INTERNATIONAL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scope === 'INTERNATIONAL'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.international}
              </button>
              <button
                type="button"
                onClick={() => setScope('DOMESTIC')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scope === 'DOMESTIC'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.domestic}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-500 text-rose-200 rounded-xl p-4 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-rose-300 block">{t.warning}:</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Upload & Replace Feedback Banner */}
      {uploadFeedback && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{uploadFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadFeedback(null)}
            className="text-emerald-400 hover:text-white p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Blacklist Critical Warnings if triggered */}
      {(senderMatch || receiverMatch) && (
        <div className="bg-rose-950/90 border-2 border-rose-500 text-white rounded-2xl p-5 shadow-2xl space-y-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider text-rose-300">
              {t.blacklistWarningTitle}
            </h3>
          </div>
          
          {senderMatch && (
            <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-700 text-xs space-y-1">
              <strong className="text-rose-200 font-bold block">
                🚨 Sender Match: {senderMatch.fullNameEn} ({senderMatch.fullNameMm})
              </strong>
              <div className="text-slate-300">
                <span>NRC: </span><span className="font-mono text-white">{senderMatch.nrcNumber}</span> | 
                <span> Passport: </span><span className="font-mono text-white">{senderMatch.passportNumber || senderMatch.passbookNumber || '-'}</span> | 
                <span> Risk: </span><span className="font-bold text-rose-400">{senderMatch.riskLevel}</span>
              </div>
              <div className="text-rose-200 italic mt-1 bg-black/30 p-2 rounded">
                Note: "{senderMatch.note}"
              </div>
            </div>
          )}

          {receiverMatch && (
            <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-700 text-xs space-y-1">
              <strong className="text-rose-200 font-bold block">
                🚨 Receiver Match: {receiverMatch.fullNameEn} ({receiverMatch.fullNameMm})
              </strong>
              <div className="text-slate-300">
                <span>NRC: </span><span className="font-mono text-white">{receiverMatch.nrcNumber}</span> | 
                <span> Passport: </span><span className="font-mono text-white">{receiverMatch.passportNumber || receiverMatch.passbookNumber || '-'}</span>
              </div>
              <div className="text-rose-200 italic mt-1 bg-black/30 p-2 rounded">
                Note: "{receiverMatch.note}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* UPPER FRAME: Sender Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t.senderInformation}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {/* Upload NRC to Auto Fill Button */}
                <label className="inline-flex items-center space-x-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer border border-emerald-500/50 shadow-xs transition-all hover:scale-[1.02]">
                  <Upload className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{language === 'my' ? 'မှတ်ပုံတင် Upload (Auto တန်းဖြည့်မည်)' : 'Upload NRC (Auto Fill)'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.svg"
                    className="hidden"
                    onChange={(e) => handleUploadFile(e, 'nrc-front')}
                  />
                </label>
                {/* Quick Customer Picker */}
                <select
                  onChange={(e) => handleSelectSenderCustomer(e.target.value)}
                  className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>{language === 'my' ? '-- ဖောက်သည် အမြန်ရွေးရန် --' : '-- Customer Picker --'}</option>
                  {db.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullNameEn} ({c.nrcNumber})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* OCR Auto-fill Scanning Indicator */}
            {isScanningNrc && (
              <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 text-amber-200 shadow-sm flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-2.5">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-xs font-bold text-white">
                    {language === 'my'
                      ? '🔍 မှတ်ပုံတင်ကတ်ပြားအား AI Vision OCR ဖြင့် အသေးစိတ် စစ်ဆေးဖတ်ရှုနေပါသည်...'
                      : '🔍 AI Vision OCR is scanning the NRC Card for handwritten/printed details...'}
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  SCANNING
                </span>
              </div>
            )}

            {/* OCR Auto-fill Notification Banner */}
            {nrcOcrResult && !isScanningNrc && (
              <div className="bg-emerald-950/70 border border-emerald-500/60 rounded-xl p-3 text-emerald-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-white text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>
                      {language === 'my'
                        ? '✨ မှတ်ပုံတင်မှ အချက်အလက်များ အလိုအလျောက် ရယူဖြည့်သွင်းပြီးပါပြီ (Auto-Filled)'
                        : '✨ NRC Card Details Auto-Extracted & Populated'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold text-[10px] border border-emerald-500/30">
                      ✓ {nrcOcrResult.confidence}% {nrcOcrResult.method === 'AI_GEMINI_VISION' ? 'AI_VISION_OCR' : nrcOcrResult.method}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNrcOcrResult(null)}
                      className="text-slate-400 hover:text-white text-xs p-0.5 cursor-pointer"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 p-2.5 rounded-lg border border-emerald-900/60 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">အမည် (Name):</span>
                    <span className="text-white font-bold truncate block">{nrcOcrResult.nameEn || senderName}</span>
                    {nrcOcrResult.nameMm && <span className="text-slate-300 text-[10px] truncate block">{nrcOcrResult.nameMm}</span>}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">မှတ်ပုံတင်နံပတ် (NRC):</span>
                    <span className="text-amber-300 font-bold block">{nrcOcrResult.nrcNumber || senderNrc}</span>
                    {nrcOcrResult.nrcNumberMm && <span className="text-slate-400 text-[10px] block">{nrcOcrResult.nrcNumberMm}</span>}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">မွေးသက္ကရာဇ် (DOB):</span>
                    <span className="text-slate-200 block">{nrcOcrResult.dob || senderDateOfBirth || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">အဘအမည် (Father):</span>
                    <span className="text-slate-200 truncate block">{nrcOcrResult.fatherName || senderFatherName || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Names & ID Type Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderName} *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. U Zaw Win Htet"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderNameMm}</label>
                <input
                  type="text"
                  value={senderNameMm}
                  onChange={(e) => setSenderNameMm(e.target.value)}
                  placeholder="e.g. ဦးဇော်ဝင်းထက်"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* ID Type Switcher & Number */}
              <div className="sm:col-span-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold text-[11px] flex items-center space-x-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>{language === 'my' ? 'ငွေလွှဲသူ သက်သေခံကတ်ပြား အမျိုးအစား' : 'Sender Identity Document Type'}</span>
                  </span>
                  {/* Selector Switch */}
                  <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSenderIdType('NRC')}
                      className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                        senderIdType === 'NRC'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{language === 'my' ? 'မှတ်ပုံတင် (NRC)' : 'NRC Card'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSenderIdType('PASSPORT')}
                      className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                        senderIdType === 'PASSPORT'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileCheck className="w-3 h-3" />
                      <span>{language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport'}</span>
                    </button>
                  </div>
                </div>

                {senderIdType === 'NRC' ? (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold text-xs">
                      {t.senderNrc} * {senderMatch ? <span className="text-rose-400 font-bold">(FLAGGED)</span> : <span className="text-emerald-400">✓</span>}
                    </label>
                    <input
                      type="text"
                      required
                      value={senderNrc}
                      onChange={(e) => setSenderNrc(e.target.value)}
                      placeholder="12/BAHANA(N)184920"
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                        senderMatch ? 'border-rose-500 bg-rose-950/30' : 'border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold text-xs">
                      {t.senderPassbook} *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderPassport}
                      onChange={(e) => setSenderPassport(e.target.value)}
                      placeholder="MA-918234"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* SENDER IDENTITY ATTACHMENT BOXES */}
                {senderIdType === 'NRC' ? (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'my' ? 'မှတ်ပုံတင် ရှေ့/နောက် ပူးတွဲဖိုင်များ' : 'NRC Front & Back Attachments'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAttachBothNrc}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer hover:scale-[1.02]"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>{language === 'my' ? 'ရှေ့/နောက် တစ်ပြိုင်နက်တွဲမည်' : 'Attach Both'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* FRONT NRC */}
                      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'my' ? 'NRC အရှေ့ခြမ်း' : 'Front NRC'}</span>
                          </span>
                          {senderNrcFrontDoc && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                              ✓ {language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}
                            </span>
                          )}
                        </div>

                        {senderNrcFrontDoc?.url ? (
                          <div className="space-y-1.5">
                            <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/10] flex items-center justify-center">
                              <img src={senderNrcFrontDoc.url} alt="NRC Front" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1 backdrop-blur-[2px]">
                                <button
                                  type="button"
                                  onClick={() => openLightbox({
                                    title: language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (Front)' : "Sender's NRC Card (Front)",
                                    url: senderNrcFrontDoc.url,
                                    name: senderNrcFrontDoc.name,
                                    size: senderNrcFrontDoc.size,
                                    idNumber: senderNrc
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                                  title="Enlarge"
                                >
                                  <Maximize2 className="w-3 h-3 text-emerald-400" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="truncate max-w-[110px] font-mono">{senderNrcFrontDoc.name}</span>
                              <span className="text-emerald-400 font-mono">{senderNrcFrontDoc.size}</span>
                            </div>
                            <div className="flex items-center space-x-1 pt-1 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (Front)' : "Sender's NRC Card (Front)",
                                  url: senderNrcFrontDoc.url,
                                  name: senderNrcFrontDoc.name,
                                  size: senderNrcFrontDoc.size,
                                  idNumber: senderNrc
                                })}
                                className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-semibold cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{language === 'my' ? 'ကြည့်' : 'View'}</span>
                              </button>
                              <label className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer transition-colors">
                                <Upload className="w-3 h-3" />
                                <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleUploadFile(e, 'nrc-front')}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc('nrc-front')}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-700 rounded-lg p-2.5 text-center space-y-1.5">
                            <p className="text-[10px] text-slate-400">
                              {language === 'my' ? 'အရှေ့ခြမ်း မတွဲရသေးပါ' : 'No front side attached'}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={handleAttachSampleNrcFront}
                                className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold cursor-pointer"
                              >
                                + {language === 'my' ? 'နမူနာတွဲ' : 'Sample'}
                              </button>
                              <label className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer">
                                <span>{language === 'my' ? 'တင်မည်' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleUploadFile(e, 'nrc-front')}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* BACK NRC */}
                      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'my' ? 'NRC အနောက်ခြမ်း' : 'Back NRC'}</span>
                          </span>
                          {senderNrcBackDoc && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                              ✓ {language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}
                            </span>
                          )}
                        </div>

                        {senderNrcBackDoc?.url ? (
                          <div className="space-y-1.5">
                            <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/10] flex items-center justify-center">
                              <img src={senderNrcBackDoc.url} alt="NRC Back" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1 backdrop-blur-[2px]">
                                <button
                                  type="button"
                                  onClick={() => openLightbox({
                                    title: language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (Back)' : "Sender's NRC Card (Back)",
                                    url: senderNrcBackDoc.url,
                                    name: senderNrcBackDoc.name,
                                    size: senderNrcBackDoc.size,
                                    idNumber: senderNrc
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                                  title="Enlarge"
                                >
                                  <Maximize2 className="w-3 h-3 text-emerald-400" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="truncate max-w-[110px] font-mono">{senderNrcBackDoc.name}</span>
                              <span className="text-emerald-400 font-mono">{senderNrcBackDoc.size}</span>
                            </div>
                            <div className="flex items-center space-x-1 pt-1 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (Back)' : "Sender's NRC Card (Back)",
                                  url: senderNrcBackDoc.url,
                                  name: senderNrcBackDoc.name,
                                  size: senderNrcBackDoc.size,
                                  idNumber: senderNrc
                                })}
                                className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-semibold cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{language === 'my' ? 'ကြည့်' : 'View'}</span>
                              </button>
                              <label className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer transition-colors">
                                <Upload className="w-3 h-3" />
                                <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleUploadFile(e, 'nrc-back')}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc('nrc-back')}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-700 rounded-lg p-2.5 text-center space-y-1.5">
                            <p className="text-[10px] text-slate-400">
                              {language === 'my' ? 'အနောက်ခြမ်း မတွဲရသေးပါ' : 'No back side attached'}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={handleAttachSampleNrcBack}
                                className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold cursor-pointer"
                              >
                                + {language === 'my' ? 'နမူနာတွဲ' : 'Sample'}
                              </button>
                              <label className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer">
                                <span>{language === 'my' ? 'တင်မည်' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleUploadFile(e, 'nrc-back')}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PASSPORT ATTACHMENT BOX */
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                        <span>{language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport) ပူးတွဲဖိုင်' : 'Passport Document Attachment'}</span>
                      </span>
                      {senderPassportDoc && (
                        <span className="text-[9px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded">
                          ✓ {language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-900 border border-sky-500/30 rounded-xl p-3">
                      {senderPassportDoc?.url ? (
                        <div className="space-y-2">
                          <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/9] flex items-center justify-center">
                            <img src={senderPassportDoc.url} alt="Sender Passport" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport",
                                  url: senderPassportDoc.url,
                                  name: senderPassportDoc.name,
                                  size: senderPassportDoc.size,
                                  idNumber: senderPassport
                                })}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                                title="Enlarge"
                              >
                                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="truncate max-w-[180px] font-mono">{senderPassportDoc.name}</span>
                            <span className="text-sky-400 font-mono font-semibold">{senderPassportDoc.size}</span>
                          </div>
                          <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport",
                                url: senderPassportDoc.url,
                                name: senderPassportDoc.name,
                                size: senderPassportDoc.size,
                                idNumber: senderPassport
                              })}
                              className="flex-1 inline-flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ကြည့်ရှု' : 'View'}</span>
                            </button>
                            <label className="flex-1 inline-flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ပုံအသစ် အစားထိုး' : 'Replace Picture'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'passport')}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc('passport')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-700 rounded-lg p-3 text-center space-y-2">
                          <p className="text-xs text-slate-400">
                            {language === 'my' ? 'Passport ပူးတွဲဖိုင် မရှိသေးပါ' : 'No passport attached yet'}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleAttachSamplePassport}
                              className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold cursor-pointer"
                            >
                              + {language === 'my' ? 'နမူနာ Passport တွဲမည်' : 'Attach Sample Passport'}
                            </button>
                            <label className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer">
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload Passport'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'passport')}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderPhone} *</label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="09-420019283"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderCountry}</label>
                <select
                  value={senderCountryCode}
                  onChange={(e) => setSenderCountryCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                >
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium flex items-center gap-1.5">
                    <span>{t.senderAddress}</span>
                    {senderNrcBackDoc && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-normal">
                        ✓ {language === 'my' ? 'NRC အနောက်ခြမ်းမှ Auto ဖတ်ယူပြီး' : 'Scanned from NRC Back'}
                      </span>
                    )}
                  </label>
                  {isScanningNrc && (
                    <span className="text-[10px] text-sky-400 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                      <span>{language === 'my' ? 'လိပ်စာ ဖတ်ရှုနေပါသည်...' : 'Scanning address...'}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="e.g. အလွမ်းဆွတ်ကျေးရွာ၊ သန်လျင်မြို့"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{language === 'my' ? 'အဘအမည် (Father Name)' : 'Father Name'}</label>
                <input
                  type="text"
                  value={senderFatherName}
                  onChange={(e) => setSenderFatherName(e.target.value)}
                  placeholder="U Tin Aung"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{language === 'my' ? 'အလုပ်အကိုင် (Occupation)' : 'Occupation'}</label>
                <input
                  type="text"
                  value={senderOccupation}
                  onChange={(e) => setSenderOccupation(e.target.value)}
                  placeholder="Company Staff"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{language === 'my' ? 'ငွေကြေးရရှိရာ လမ်းကြောင်း (Source of Funds)' : 'Source of Funds'}</label>
                <input
                  type="text"
                  value={senderSourceOfFund}
                  onChange={(e) => setSenderSourceOfFund(e.target.value)}
                  placeholder="Salary / Business Income"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <DobDatePicker
                  id="sender-dob-entry"
                  label={language === 'my' ? 'မွေးသက္ကရာဇ် (Date of Birth)' : 'Date of Birth'}
                  placeholder="DD/MM/YYYY"
                  value={senderDateOfBirth}
                  onChange={(formattedDob) => setSenderDateOfBirth(formattedDob)}
                  language={language}
                />
              </div>
            </div>
          </div>

        {/* LOWER FRAME: Receiver Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <UserCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t.receiverInformation}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'my' ? 'ငွေလက်ခံသူ၏ ကိုယ်ရေးအချက်အလက်များနှင့် လိပ်စာ' : 'Receiver identity, ID / Passport & destination country'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                {language === 'my' ? 'ငွေလက်ခံသူ' : 'Receiver Details'}
              </span>
              <select
                onChange={(e) => handleSelectReceiverCustomer(e.target.value)}
                className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>{language === 'my' ? '-- ဖောက်သည် အမြန်ရွေးရန် --' : '-- Quick Load Customer --'}</option>
                {db.customers.map(c => (
                  <option key={c.id} value={c.id}>{c.fullNameEn} ({c.nrcNumber})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverName} *</label>
              <input
                type="text"
                required
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g. Somchai Prasert / Ma Su Myat"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverNameMm}</label>
              <input
                type="text"
                value={receiverNameMm}
                onChange={(e) => setReceiverNameMm(e.target.value)}
                placeholder="e.g. မဆုမြတ်ထက်"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                {t.receiverNrc} {receiverMatch ? <span className="text-rose-400 font-bold">(FLAGGED)</span> : ''}
              </label>
              <input
                type="text"
                value={receiverNrc}
                onChange={(e) => setReceiverNrc(e.target.value)}
                placeholder="12/BAHANA(N)291840 or Foreign ID"
                className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                  receiverMatch ? 'border-rose-500 bg-rose-950/30' : 'border-slate-700 focus:border-sky-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverPassbook}</label>
              <input
                type="text"
                value={receiverPassport}
                onChange={(e) => setReceiverPassport(e.target.value)}
                placeholder="Passport No / ID"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverPhone} *</label>
              <input
                type="text"
                required
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="+66-89-123-9988"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverCountry}</label>
              <select
                value={receiverCountryCode}
                onChange={(e) => {
                  setReceiverCountryCode(e.target.value);
                  const country = db.countries.find(c => c.code === e.target.value);
                  if (country && country.currencyCode) {
                    setTargetCurrency(country.currencyCode);
                  }
                }}
                disabled={scope === 'DOMESTIC'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none disabled:opacity-60"
              >
                {db.countries.map(c => (
                  <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverAddress}</label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="Pratunam Market, Ratchathewi, Bangkok, Thailand"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Financials, Exchange Rate & Settlement */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.financialDetails}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Rate ID: LIVE-{sourceCurrency}/{targetCurrency}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Source Currency */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.sourceCurrency}</label>
              <select
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-sky-500 focus:outline-none"
              >
                {db.currencies.map(c => (
                  <option key={c.id} value={c.code}>{c.code} - {language === 'my' ? c.nameMm : c.nameEn}</option>
                ))}
              </select>
            </div>

            {/* Target Currency */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.targetCurrency}</label>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                disabled={scope === 'DOMESTIC'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-sky-500 focus:outline-none disabled:opacity-60"
              >
                {db.currencies.map(c => (
                  <option key={c.id} value={c.code}>{c.code} - {language === 'my' ? c.nameMm : c.nameEn}</option>
                ))}
              </select>
            </div>

            {/* Send Amount */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.sendAmount} *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">{sourceCurrency}</span>
              </div>
            </div>

            {/* Exchange Rate */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.exchangeRate}</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">MMK</span>
              </div>
            </div>
          </div>

          {/* Real-time calculated Result Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border-r border-slate-800 pr-4">
              <span className="text-slate-400 text-xs block">{t.receiveAmount} (လက်ခံရရှိငွေ)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                {calculatedReceiveAmount.toLocaleString()} {targetCurrency}
              </span>
            </div>

            <div className="border-r border-slate-800 pr-4">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>{t.serviceFee}:</span>
                <span className="font-mono text-white">{serviceFee.toLocaleString()} MMK</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                <span>{t.commissionFee}:</span>
                <span className="font-mono text-white">{commissionFee.toLocaleString()} MMK</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-xs block">{t.totalPayable} (စုစုပေါင်းပေးချေငွေ)</span>
              <span className="text-xl font-black text-white font-mono mt-1 block">
                {totalPayableAmount.toLocaleString()} {sourceCurrency}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Purpose, Method, Bank Partner & Attachment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-800">
            {language === 'my' ? 'ငွေလွှဲရည်ရွယ်ချက် နှင့် ထုတ်ပေးမည့် ပုံစံ' : 'Purpose & Routing Details'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Sending Branch */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                {language === 'my' ? 'ဆောင်ရွက်သည့် ဘဏ်ခွဲ (Sending Branch)' : 'Sending Branch'} *
              </label>
              <select
                value={sendingBranchId}
                onChange={(e) => setSendingBranchId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none font-medium"
              >
                {db.branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.nameEn} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.purposeOfRemit} *</label>
              <select
                value={purposeId}
                onChange={(e) => setPurposeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                {db.purposes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {language === 'my' ? p.nameMm : p.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Payout Method */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.payoutMethod}</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="CASH_PICKUP">{t.cashPickup}</option>
                <option value="BANK_ACCOUNT">{t.bankAccount}</option>
                <option value="MOBILE_WALLET">{t.mobileWallet}</option>
              </select>
            </div>

            {/* Partner Company / Bank */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.partnerCompany}</label>
              <select
                value={partnerCompanyId}
                onChange={(e) => setPartnerCompanyId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                {db.companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {language === 'my' ? c.nameMm : c.nameEn} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">{t.noteOrRemarks}</label>
              <input
                type="text"
                value={senderNote}
                onChange={(e) => setSenderNote(e.target.value)}
                placeholder="e.g. Overseas education fee payment NUS Fall Semester"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Attach Deposit / NRC Proof - High-grade Interactive Section */}
            <div className="sm:col-span-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4.5 space-y-4 shadow-md">
              {/* Header & Category Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Paperclip className="w-4 h-4" />
                    </span>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {language === 'my' ? 'ငွေသွင်းပြေစာ / မှတ်ပုံတင် ပူးတွဲဖိုင် (Attach Deposit / NRC Proof)' : 'Attach Deposit / NRC Proof'}
                    </h4>
                    {scope === 'DOMESTIC' && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold">
                        {language === 'my' ? 'ပြည်တွင်းငွေလွှဲ' : 'Domestic Remittance'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'my'
                      ? 'ပြည်တွင်းငွေလွှဲအတွက် ငွေသွင်း/လွှဲသူ၏ မှတ်ပုံတင် (ရှေ့/နောက်) သို့မဟုတ် ဘဏ်ငွေသွင်းပြေစာကို အောက်တွင် ပူးတွဲထည့်သွင်းနိုင်ပါသည်'
                      : 'Attach depositor/sender NRC (Front & Back) or Bank Cash Deposit Receipt for compliance & verification'}
                  </p>
                </div>

                {/* Category Tabs */}
                <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setProofCategory('NRC');
                      if (senderNrcFrontDoc?.name) setProofDocumentName(senderNrcFrontDoc.name);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      proofCategory === 'NRC'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'မှတ်ပုံတင် (NRC Proof)' : 'NRC Proof'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProofCategory('DEPOSIT_RECEIPT');
                      if (depositReceiptDoc?.name) setProofDocumentName(depositReceiptDoc.name);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      proofCategory === 'DEPOSIT_RECEIPT'
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip)' : 'Deposit Slip'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofCategory('CUSTOM')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      proofCategory === 'CUSTOM'
                        ? 'bg-slate-700 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'အခြားပူးတွဲဖိုင်' : 'Other Doc'}</span>
                  </button>
                </div>
              </div>

              {/* CATEGORY 1: NRC PROOF (FRONT & BACK) */}
              {proofCategory === 'NRC' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/60">
                    <div className="text-xs text-emerald-200 flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {language === 'my'
                          ? 'မှတ်ပုံတင် (ရှေ့ခြမ်း နှင့် နောက်ခြမ်း) အထောက်အထား ပူးတွဲစနစ်'
                          : 'Sender NRC Proof Attachment (Front & Back Side Verification)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAttachBothNrc}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{language === 'my' ? 'မှတ်ပုံတင် (ရှေ့/နောက်) ပူးတွဲမည်' : 'Attach NRC (Both Sides)'}</span>
                      </button>

                      <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload NRC File'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.svg"
                          className="hidden"
                          onChange={(e) => handleUploadFile(e, 'nrc-both')}
                        />
                      </label>
                    </div>
                  </div>

                  {/* 2-Column Grid for Front & Back NRC */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* NRC Front Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (NRC Front)' : 'NRC Card - Front Side'}</span>
                        </span>
                        {senderNrcFrontDoc ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                            ✓ {language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                            {language === 'my' ? 'မတွဲရသေးပါ' : 'Not Attached'}
                          </span>
                        )}
                      </div>

                      {senderNrcFrontDoc?.url ? (
                        <div className="space-y-2">
                          <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/10] flex items-center justify-center">
                            <img src={senderNrcFrontDoc.url} alt="NRC Front Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (Front)' : "Sender's NRC Card (Front)",
                                  url: senderNrcFrontDoc.url,
                                  name: senderNrcFrontDoc.name,
                                  size: senderNrcFrontDoc.size,
                                  idNumber: senderNrc
                                })}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                                title="Enlarge"
                              >
                                <Maximize2 className="w-4 h-4 text-emerald-400" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate max-w-[180px] font-mono">{senderNrcFrontDoc.name}</span>
                            <span className="text-emerald-400 font-mono font-semibold">{senderNrcFrontDoc.size}</span>
                          </div>

                          {/* Action buttons: View, Replace Picture, Remove */}
                          <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (Front)' : "Sender's NRC Card (Front)",
                                url: senderNrcFrontDoc.url,
                                name: senderNrcFrontDoc.name,
                                size: senderNrcFrontDoc.size,
                                idNumber: senderNrc
                              })}
                              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ကြည့်ရှုမည်' : 'View'}</span>
                            </button>

                            <label className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ပုံအသစ် အစားထိုး' : 'Replace Picture'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-front')}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveDoc('nrc-front')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center space-y-2.5 transition-colors">
                          <p className="text-xs text-slate-400">
                            {language === 'my' ? 'အရှေ့ခြမ်း ဓာတ်ပုံ သို့မဟုတ် ဖိုင် မတွဲရသေးပါ' : 'Front NRC document has not been attached yet'}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleAttachSampleNrcFront}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
                            >
                              + {language === 'my' ? 'နမူနာ အရှေ့ခြမ်းတွဲ' : 'Attach Sample Front'}
                            </button>
                            <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload File'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-front')}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* NRC Back Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (NRC Back)' : 'NRC Card - Back Side'}</span>
                        </span>
                        {senderNrcBackDoc ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                            ✓ {language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                            {language === 'my' ? 'မတွဲရသေးပါ' : 'Not Attached'}
                          </span>
                        )}
                      </div>

                      {senderNrcBackDoc?.url ? (
                        <div className="space-y-2">
                          <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/10] flex items-center justify-center">
                            <img src={senderNrcBackDoc.url} alt="NRC Back Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (Back)' : "Sender's NRC Card (Back)",
                                  url: senderNrcBackDoc.url,
                                  name: senderNrcBackDoc.name,
                                  size: senderNrcBackDoc.size,
                                  idNumber: senderNrc
                                })}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                                title="Enlarge"
                              >
                                <Maximize2 className="w-4 h-4 text-emerald-400" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate max-w-[180px] font-mono">{senderNrcBackDoc.name}</span>
                            <span className="text-emerald-400 font-mono font-semibold">{senderNrcBackDoc.size}</span>
                          </div>

                          {/* Action buttons: View, Replace Picture, Remove */}
                          <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (Back)' : "Sender's NRC Card (Back)",
                                url: senderNrcBackDoc.url,
                                name: senderNrcBackDoc.name,
                                size: senderNrcBackDoc.size,
                                idNumber: senderNrc
                              })}
                              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ကြည့်ရှုမည်' : 'View'}</span>
                            </button>

                            <label className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ပုံအသစ် အစားထိုး' : 'Replace Picture'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-back')}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveDoc('nrc-back')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center space-y-2.5 transition-colors">
                          <p className="text-xs text-slate-400">
                            {language === 'my' ? 'အနောက်ခြမ်း ဓာတ်ပုံ သို့မဟုတ် ဖိုင် မတွဲရသေးပါ' : 'Back NRC document has not been attached yet'}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleAttachSampleNrcBack}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
                            >
                              + {language === 'my' ? 'နမူနာ အနောက်ခြမ်းတွဲ' : 'Attach Sample Back'}
                            </button>
                            <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload File'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-back')}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 2: BANK DEPOSIT SLIP VOUCHER */}
              {proofCategory === 'DEPOSIT_RECEIPT' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-sky-950/40 p-2.5 rounded-xl border border-sky-900/60">
                    <div className="text-xs text-sky-200 flex items-center space-x-2">
                      <Receipt className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>
                        {language === 'my'
                          ? 'ဘဏ်ငွေသွင်းပြေစာ (Bank Cash Deposit Slip) ပူးတွဲစနစ် - ငွေသွင်းသူ၊ ဘဏ်ခွဲနှင့် တံဆိပ်တုံး ပါဝင်သော ပြေစာ'
                          : 'Bank Cash Deposit Slip Voucher Proof (Includes depositor, branch seal, and verification stamps)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAttachSampleDepositSlip}
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{language === 'my' ? '⚡ ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူတွဲမည်' : '⚡ Generate Deposit Slip Voucher'}</span>
                      </button>
                    </div>
                  </div>

                  {depositReceiptDoc?.url ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                          <Receipt className="w-4 h-4 text-sky-400" />
                          <span>{language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ ဘောက်ချာ' : 'Bank Cash Deposit Receipt Voucher'}</span>
                        </span>
                        <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded-full">
                          ✓ {language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}
                        </span>
                      </div>

                      <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-56 flex items-center justify-center">
                        <img src={depositReceiptDoc.url} alt="Deposit Slip Voucher" className="w-full h-auto object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Bank Cash Deposit Receipt)' : 'Bank Cash Deposit Receipt Voucher',
                              url: depositReceiptDoc.url,
                              name: depositReceiptDoc.name,
                              size: depositReceiptDoc.size,
                              idNumber: senderNrc || 'Cash Deposit'
                            })}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                            title="Enlarge"
                          >
                            <Maximize2 className="w-4 h-4 text-sky-400" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate max-w-[280px] font-mono">{depositReceiptDoc.name}</span>
                        <span className="text-sky-400 font-mono font-semibold">{depositReceiptDoc.size}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => openLightbox({
                            title: language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Bank Cash Deposit Receipt)' : 'Bank Cash Deposit Receipt Voucher',
                            url: depositReceiptDoc.url,
                            name: depositReceiptDoc.name,
                            size: depositReceiptDoc.size,
                            idNumber: senderNrc || 'Cash Deposit'
                          })}
                          className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === 'my' ? 'အသေးစိတ် ကြည့်ရှုမည်' : 'View / Enlarge Voucher'}</span>
                        </button>

                        <label className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{language === 'my' ? 'ပုံအသစ် အစားထိုးတင်' : 'Replace Picture'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleUploadFile(e, 'deposit')}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveDoc('deposit')}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-700 hover:border-sky-500/50 rounded-xl p-5 text-center space-y-3 transition-colors bg-slate-900/50">
                      <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {language === 'my'
                          ? 'ဘဏ်ငွေသွင်းပြေစာ မတွဲရသေးပါ - အထက်ပါခလုတ်ဖြင့် ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူနိုင်သလို ကောင်တာမှရရှိသည့် ပြေစာဓာတ်ပုံကိုလည်း တင်သွင်းနိုင်ပါသည်'
                          : 'No deposit slip attached yet. You can auto-generate a sample bank deposit receipt voucher or upload a physical photo scan.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAttachSampleDepositSlip}
                          className="px-4 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition-colors cursor-pointer"
                        >
                          + {language === 'my' ? 'ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူတွဲမည်' : 'Generate Bank Deposit Slip'}
                        </button>
                        <label className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm">
                          <Upload className="w-4 h-4" />
                          <span>{language === 'my' ? 'ငွေသွင်းပြေစာ ဓာတ်ပုံတင်မည်' : 'Upload Deposit Slip'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleUploadFile(e, 'deposit')}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORY 3: CUSTOM / OTHER DOCUMENT */}
              {proofCategory === 'CUSTOM' && (
                <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <label className="block text-slate-300 text-xs font-medium mb-1">
                    {language === 'my' ? 'စာရွက်စာတမ်း အမည် / ဖိုင်' : 'Supporting Document Name / File'}
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={proofDocumentName}
                      onChange={(e) => setProofDocumentName(e.target.value)}
                      placeholder="e.g. Deposit_Receipt_0902.pdf or Invoice_Proof.pdf"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                    />

                    <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{language === 'my' ? 'ဖိုင်ရွေးချယ်တင်မည်' : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf,.svg,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleUploadFile(e, 'custom')}
                      />
                    </label>
                  </div>

                  {customProofDoc && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mt-2">
                      <div className="flex items-center space-x-2 truncate">
                        <FileCheck className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="font-mono truncate">{customProofDoc.name}</span>
                        <span className="text-slate-500">({customProofDoc.size})</span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {customProofDoc.url && (
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: customProofDoc.name || 'Supporting Document',
                              url: customProofDoc.url,
                              name: customProofDoc.name,
                              size: customProofDoc.size
                            })}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc('custom')}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-rose-400"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Branch Information Banner */}
          {(() => {
            const curBranch = db.branches.find(b => b.id === sendingBranchId) || db.branches[0];
            if (!curBranch) return null;
            return (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">
                        {language === 'my' && curBranch.nameMm ? `${curBranch.nameMm} (${curBranch.nameEn})` : curBranch.nameEn}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono text-[10px] font-bold">
                        {curBranch.code}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        {curBranch.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs mt-1.5">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-500" />
                        <span>{curBranch.address}, {curBranch.city}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-sky-500" />
                        <span className="font-mono text-slate-300 font-semibold">{curBranch.phone}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 sm:border-l border-slate-800 sm:pl-4">
                  <span className="text-slate-500 block text-[11px]">{language === 'my' ? 'ဘဏ်ခွဲ မန်နေဂျာ' : 'Branch Manager'}</span>
                  <span className="font-bold text-slate-200">{curBranch.managerName}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Submit & Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : t.submitForApproval}</span>
          </button>
        </div>
      </form>

      {/* Generated Voucher Modal upon creation */}
      <VoucherModal
        isOpen={!!createdTx}
        transaction={createdTx}
        onClose={() => setCreatedTx(null)}
      />

      {/* Document Lightbox Modal for Enlarge & Inspection */}
      <DocumentLightboxModal
        isOpen={!!lightboxDoc?.isOpen}
        onClose={() => setLightboxDoc(null)}
        docTitle={lightboxDoc?.title || ''}
        docUrl={lightboxDoc?.url}
        docName={lightboxDoc?.name}
        docSize={lightboxDoc?.size}
        docType={lightboxDoc?.type || "image/svg+xml"}
        idNumber={lightboxDoc?.idNumber}
      />
    </div>
  );
};

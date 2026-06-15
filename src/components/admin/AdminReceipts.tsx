import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdReceipt, MdSearch, MdDownload } from 'react-icons/md';
import jsPDF from 'jspdf';
import { receiptApi, Receipt } from '../../api/receipts';
import { financeApi, Contribution } from '../../api/finance';
import { useDataRefresh } from '../../context/DataRefreshContext';
import { saveFileWithDialog } from '../../api/export';
import { fetchChurchAssets, drawChurchHeader, drawFooter } from '../../utils/pdfUtils';
import './AdminViews.css';

const AdminReceipts: React.FC = () => {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchMember, setSearchMember] = useState('');
    const [selectedContributionId, setSelectedContributionId] = useState<string | null>(null);
    const { refreshSignal, triggerRefresh } = useDataRefresh();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [r, c] = await Promise.all([
                receiptApi.getReceipts(searchMember || undefined),
                financeApi.getContributions(100, 0),
            ]);
            setReceipts(r); setContributions(c);
        } catch { toast.error('Failed to load data.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [refreshSignal]);

    const handleGenerate = async () => {
        if (!selectedContributionId) { toast.error('Select a contribution first.'); return; }
        try {
            await receiptApi.generateReceipt({ contribution_id: selectedContributionId });
            toast.success('Receipt generated.');
            setSelectedContributionId(null);
            triggerRefresh();
        } catch { toast.error('Failed.'); }
    };

    const handleDownload = async (receipt: Receipt) => {
        try {
            const doc = new jsPDF();
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 20;
            const contentW = pageW - margin * 2;

            const { config, logoDataUrl } = await fetchChurchAssets();
            const currency = config.currency || 'Ghc';
            const headerEnd = drawChurchHeader(doc, config, logoDataUrl);
            let y = headerEnd;

            // decorative subtitle bar
            doc.setFillColor(41, 98, 255);
            doc.rect(margin, y, contentW, 10, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('CONTRIBUTION RECEIPT', pageW / 2, y + 7, { align: 'center' });
            y += 18;

            doc.setTextColor(0, 0, 0);

            // receipt info — two column layout
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);

            const leftX = margin;
            const rightX = pageW / 2 + 5;
            const lineHeight = 7;

            doc.setFont('helvetica', 'bold');
            doc.text('RECEIPT NUMBER', leftX, y);
            doc.setFont('helvetica', 'normal');
            doc.setFont('courier', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text(`#${receipt.receipt_number}`, leftX, y + lineHeight);
            y += lineHeight * 2 + 2;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text('DATE', leftX, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(new Date(receipt.date).toLocaleDateString(), leftX, y + lineHeight);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text('TYPE', rightX, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(receipt.receipt_type, rightX, y + lineHeight);
            y += lineHeight * 2 + 2;

            if (receipt.member_name) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 100, 100);
                doc.text('MEMBER', leftX, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.text(receipt.member_name, leftX, y + lineHeight);
                y += lineHeight * 2 + 4;
            }

            // separator line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageW - margin, y);
            y += 10;

            // amount
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(10);
            doc.text('AMOUNT', leftX, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(22);
            doc.text(`${currency} ${receipt.amount.toFixed(2)}`, leftX, y + 12);
            y += 22;

            if (receipt.notes) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 100, 100);
                doc.text('NOTES', leftX, y);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(0, 0, 0);
                doc.text(receipt.notes, leftX, y + lineHeight);
                y += lineHeight * 2 + 2;
            }

            // thank you
            y = Math.max(y, 140);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text('Thank you for your generous contribution.', pageW / 2, y, { align: 'center' });
            doc.text('God bless you!', pageW / 2, y + 8, { align: 'center' });

            drawFooter(doc, pageW);

            const blob = doc.output('blob');
            await saveFileWithDialog(`receipt_${receipt.receipt_number}.pdf`, blob);
            toast.success('Receipt downloaded.');
        } catch {
            toast.error('Failed to download receipt.');
        }
    };

    const filteredContributions = contributions.filter(c =>
        !searchMember || (c.member_name && c.member_name.toLowerCase().includes(searchMember.toLowerCase()))
    );

    return (
        <div className="admin-view-container animate-fade-in">
            <div className="view-header">
                <div><h1>Contribution Receipts</h1><p>Generate and manage contribution receipts.</p></div>
                <button className="btn-primary" onClick={handleGenerate} disabled={!selectedContributionId}><MdReceipt /> Generate Receipt</button>
            </div>

            <div className="admin-controls" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
                    <MdSearch className="admin-search-icon" /><input placeholder="Search member..." value={searchMember} onChange={e => { setSearchMember(e.target.value); fetchData(); }} />
                </div>
            </div>

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                    <h3>Contributions (select to generate receipt)</h3>
                    <div className="members-table-container">
                        <table className="members-table">
                            <thead><tr><th style={{ width: '40px' }}></th><th>Member</th><th>Amount</th><th>Date</th><th>Type</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={5} className="empty-table">Loading...</td></tr> :
                                filteredContributions.map(c => (
                                    <tr key={c.id} className={selectedContributionId === c.id ? 'selected-row' : ''} onClick={() => setSelectedContributionId(c.id)} style={{ cursor: 'pointer' }}>
                                        <td><input type="radio" name="sel" checked={selectedContributionId === c.id} onChange={() => setSelectedContributionId(c.id)} style={{ width: 'auto' }} /></td>
                                        <td>{c.member_name || 'N/A'}</td>
                                        <td style={{ fontWeight: 600 }}>Ghc {c.amount.toFixed(2)}</td>
                                        <td>{new Date(c.date).toLocaleDateString()}</td>
                                        <td><span className="status-badge status-info">{c.type_name || '-'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h3>Generated Receipts</h3>
                    <div className="members-table-container">
                        <table className="members-table">
                            <thead><tr><th>Receipt No.</th><th>Member</th><th>Amount</th><th>Date</th><th>Type</th><th>Actions</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={6} className="empty-table">Loading...</td></tr> :
                                receipts.length === 0 ? <tr><td colSpan={6} className="empty-table">No receipts yet.</td></tr> :
                                receipts.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{r.receipt_number}</td>
                                        <td>{r.member_name || 'N/A'}</td>
                                        <td style={{ fontWeight: 600 }}>Ghc {r.amount.toFixed(2)}</td>
                                        <td>{new Date(r.date).toLocaleDateString()}</td>
                                        <td><span className="status-badge status-info">{r.receipt_type}</span></td>
                                        <td>
                                            <button className="btn-text" title="Download Receipt" onClick={() => handleDownload(r)}><MdDownload /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminReceipts;

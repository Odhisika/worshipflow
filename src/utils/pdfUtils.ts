import jsPDF from 'jspdf';
import { AppConfig, settingsApi } from '../api/settings';
import { mediaApi } from '../api/media';

interface ChurchAssets {
  config: AppConfig;
  logoDataUrl: string;
}

async function fetchChurchAssets(): Promise<ChurchAssets> {
  const config = await settingsApi.getAppConfig();
  let logoDataUrl = '';
  if (config.church_logo) {
    try {
      logoDataUrl = await mediaApi.getLocalImageUrl(config.church_logo);
    } catch {
      // logo silent fail
    }
  }
  return { config, logoDataUrl };
}

function addLogo(doc: jsPDF, logoDataUrl: string, x: number, y: number, size: number) {
  if (!logoDataUrl) return;
  try {
    doc.addImage(logoDataUrl, 'PNG', x, y, size, size);
  } catch {
    try {
      doc.addImage(logoDataUrl, 'JPEG', x, y, size, size);
    } catch {
      // image silent fail
    }
  }
}

function drawChurchHeader(doc: jsPDF, config: AppConfig, logoDataUrl: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const logoSize = 22;
  let startY = 20;

  if (logoDataUrl) {
    addLogo(doc, logoDataUrl, margin, startY, logoSize);
  }

  const textX = logoDataUrl ? margin + logoSize + 10 : margin;
  const textStartX = textX;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(config.church_name, textStartX, startY + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  let detailY = startY + 14;
  if (config.church_address) {
    doc.text(config.church_address, textStartX, detailY);
    detailY += 5;
  }
  if (config.church_phone) {
    doc.text(`Tel: ${config.church_phone}`, textStartX, detailY);
    detailY += 5;
  }
  if (config.church_email) {
    doc.text(`Email: ${config.church_email}`, textStartX, detailY);
    detailY += 5;
  }

  doc.setTextColor(0, 0, 0);

  const headerBottom = Math.max(startY + logoSize, detailY) + 8;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, headerBottom, pageW - margin, headerBottom);

  return headerBottom + 8;
}

function drawFooter(doc: jsPDF, pageW: number) {
  const y = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y, { align: 'center' });
  doc.text('Powered by WorshipFlow Pro', pageW / 2, y + 5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

export type { ChurchAssets };
export { fetchChurchAssets, drawChurchHeader, drawFooter };

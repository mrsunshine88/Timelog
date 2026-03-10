
import type { UserProfile, CompanySettings } from './types';

export const generateContract = async (employee: UserProfile, company: CompanySettings) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // --- Helpers ---
    const drawSectionTitle = (title: string) => {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(title, margin, currentY);
        currentY += 25;
    };

    const drawField = (x: number, y: number, width: number, label: string, value: string) => {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(label, x, y - 4); // Label above the box
        doc.setDrawColor(200);
        doc.setLineWidth(0.7);
        doc.rect(x, y, width, 22, 'S'); // 'S' is for stroke
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(value, x + 5, y + 15);
    };
    
    const drawCheckbox = (x: number, y: number, label: string, checked: boolean) => {
        doc.setDrawColor(0);
        doc.setLineWidth(1);
        doc.rect(x, y, 12, 12);
        if (checked) {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('X', x + 3, y + 9);
        }
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(label, x + 18, y + 9.5);
    };

    // --- Header ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ANSTÄLLNINGSAVTAL', pageWidth / 2, currentY, { align: 'center' });
    currentY += 40;

    // --- Arbetsgivare ---
    drawSectionTitle('Arbetsgivare');
    drawField(margin, currentY, 300, 'Namn', company.companyName || '');
    drawField(margin + 310, currentY, contentWidth - 310, 'Organisationsnummer', company.orgNumber || '');
    currentY += 35;
    drawField(margin, currentY, 300, 'Adress', company.address || '');
    drawField(margin + 310, currentY, 100, 'Postnummer', company.postalCode || '');
    drawField(margin + 420, currentY, contentWidth - 420, 'Ort', company.city || '');
    currentY += 35;
    drawField(margin, currentY, 250, 'Telefon', company.companyPhone || '');
    drawField(margin + 260, currentY, contentWidth - 260, 'E-post', company.companyEmail || '');
    currentY += 35;
    drawField(margin, currentY, contentWidth, 'Kontaktperson / Firmatecknare', company.contactPerson || '');
    currentY += 45; 

    // --- Arbetstagare ---
    drawSectionTitle('Arbetstagare');
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    drawField(margin, currentY, 300, 'Namn', employeeName);
    drawField(margin + 310, currentY, contentWidth - 310, 'Personnummer', employee.ssn || '');
    currentY += 35;
    drawField(margin, currentY, 300, 'Adress', employee.address || '');
    drawField(margin + 310, currentY, 100, 'Postnummer', employee.postalCode || '');
    drawField(margin + 420, currentY, contentWidth - 420, 'Ort', employee.city || '');
    currentY += 35;
    drawField(margin, currentY, 250, 'Telefon', employee.phone || '');
    drawField(margin + 260, currentY, contentWidth - 260, 'E-post (privat)', employee.email || '');
    currentY += 35;
    drawField(margin, currentY, 250, 'Anställningsnummer', employee.employeeId);
    currentY += 45;

    // --- Anställning ---
    drawSectionTitle('Anställning');
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Anställningsform', margin, currentY - 4);
    doc.setFont('Helvetica', 'normal');
    drawCheckbox(margin, currentY, 'Tillsvidare', employee.employmentType === 'Tillsvidare');
    drawCheckbox(margin + 120, currentY, 'Provanställning', employee.employmentType === 'Provanställning');
    drawCheckbox(margin + 240, currentY, 'Visstidsanställning', employee.employmentType === 'Visstidsanställning');
    currentY += 25;
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Arbetstid', margin, currentY - 4);
    doc.setFont('Helvetica', 'normal');
    drawCheckbox(margin, currentY, 'Heltid', employee.workHoursType === 'Heltid');
    drawCheckbox(margin + 120, currentY, 'Deltid', employee.workHoursType === 'Deltid');
    if (employee.workHoursType === 'Deltid' || employee.employmentPercentage) {
        drawField(margin + 240, currentY, 150, 'Sysselsättningsgrad', `${employee.employmentPercentage ?? ''}%`);
    }
    currentY += 35;
    
    drawField(margin, currentY, 250, 'Yrkestitel', employee.title || '');
    drawField(margin + 260, currentY, contentWidth - 260, 'Arbetsplats', employee.workplace || '');
    currentY += 35;

    const noticePeriodStr = (employee.noticePeriod) ? `${employee.noticePeriod} månader` : '';
    drawField(margin, currentY, 165, 'Tillträdesdag', employee.startDate || '');
    drawField(margin + 175, currentY, 165, 'Anställd t.o.m. (vid visstid)', employee.endDate || '');
    drawField(margin + 350, currentY, contentWidth - 350, 'Uppsägningstid', noticePeriodStr);
    currentY += 35;
    
    const salaryString = (employee.salaryValue != null) ? `${employee.salaryValue.toLocaleString('sv-SE')} kr` : '';
    drawField(margin, currentY, 250, 'Lön', salaryString);
    const vacationStr = (employee.vacationDays != null && employee.vacationDays != undefined) ? `${employee.vacationDays} dagar` : '';
    drawField(margin + 260, currentY, contentWidth - 260, 'Semesterdagar (per år)', vacationStr);
    currentY += 35;

    drawField(margin, currentY, 250, 'Tillämpligt kollektivavtal', employee.collectiveAgreement || '');
    drawField(margin + 260, currentY, contentWidth - 260, 'Försäkringar', employee.insurances || '');
    currentY += 35;
    
    // --- Övrigt ---
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Övriga uppgifter, förmåner & villkor', margin, currentY - 4);
    doc.setDrawColor(200);
    doc.rect(margin, currentY, contentWidth, 60);
    doc.setFontSize(9);
    doc.setTextColor(0);
    const benefitsStr = employee.benefits ? `Förmåner: ${employee.benefits}` : '';
    const otherInfoStr = employee.otherInfo || '';
    const termsStr = company.standardTerms || '';
    const combinedInfo = [benefitsStr, otherInfoStr, termsStr].filter(Boolean).join('\n');
    const otherInfoLines = doc.splitTextToSize(combinedInfo, contentWidth - 10);
    doc.text(otherInfoLines, margin + 5, currentY + 12);
    
    // --- Underskrifter ---
    const signatureY = pageHeight - margin - 80;

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Avtalet har upprättats i två exemplar, varav parterna tagit varsitt.', margin, signatureY - 20);

    // Signatur Arbetsgivare
    doc.line(margin, signatureY + 25, margin + 220, signatureY + 25);
    doc.text('Ort och datum', margin, signatureY + 38);
    doc.line(margin, signatureY + 75, margin + 220, signatureY + 75);
    doc.text(`${company.contactPerson || ''}`, margin, signatureY + 70);
    doc.text('För arbetsgivaren (namnförtydligande)', margin, signatureY + 88);

    // Signatur Arbetstagare
    const signatureX = pageWidth - margin - 220;
    doc.line(signatureX, signatureY + 25, signatureX + 220, signatureY + 25);
    doc.text('Ort och datum', signatureX, signatureY + 38);
    doc.line(signatureX, signatureY + 75, signatureX + 220, signatureY + 75);
    doc.text(employeeName, signatureX, signatureY + 70);
    doc.text('Arbetstagare (namnförtydligande)', signatureX, signatureY + 88);
    
    doc.save(`Anställningsavtal-${employee.firstName}_${employee.lastName}.pdf`);
}

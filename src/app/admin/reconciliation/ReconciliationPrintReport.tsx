import Image from 'next/image';

export type ReconciliationPrintReportProps = {
  title: string;
  subject: string;
  period: string;
  generatedAt: string;
  summaries: { label: string; value: string }[];
  columns: string[];
  rows: string[][];
};

export function ReconciliationPrintReport({
  title,
  subject,
  period,
  generatedAt,
  summaries,
  columns,
  rows,
}: ReconciliationPrintReportProps) {
  return (
    <article className="reconciliation-print-report" dir="rtl" lang="ar">
      <div className="report-brand-band">
        <div className="report-logo-wrap">
          <Image src="/brand/logo_rawaq.png" alt="رَواق" width={112} height={84} priority />
        </div>
        <div className="report-brand-copy">
          <p>رَواق · RAWAQ</p>
          <span>تقرير داخلي مفصّل</span>
        </div>
        <div className="report-number">
          <span>نوع الجرد</span>
          <strong>{title}</strong>
        </div>
      </div>

      <section className="report-meta-grid" aria-label="تفاصيل التقرير">
        <div><span>الجهة / القسم</span><strong>{subject}</strong></div>
        <div><span>الفترة المحددة</span><strong>{period}</strong></div>
        <div><span>تاريخ إنشاء التقرير</span><strong>{generatedAt}</strong></div>
        <div><span>عدد السجلات المعروضة</span><strong>{rows.length.toLocaleString('en-GB')}</strong></div>
      </section>

      <section className="report-summary-section">
        <div className="report-section-heading">
          <h2>ملخص الجرد</h2>
          <span aria-hidden="true">✦</span>
        </div>
        <div className="report-summary-grid">
          {summaries.map((summary) => (
            <div className="report-summary-card" key={summary.label}>
              <span>{summary.label}</span>
              <strong>{summary.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="report-details-section">
        <div className="report-section-heading">
          <h2>تفاصيل العمليات</h2>
          <span className="report-row-count">{rows.length.toLocaleString('en-GB')} سجل</span>
        </div>
        {rows.length ? (
          <table className="report-data-table">
            <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row[0]}`}>
                {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell || '—'}</td>)}
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <p className="report-empty-state">لا توجد سجلات ضمن الفلاتر والفترة المحددة.</p>
        )}
      </section>

      <div className="report-footer">
        <span>رَواق — أناقة أردنية معاصرة</span>
        <span>تم إنشاء هذا التقرير من صفحة الجرد والتسويات</span>
      </div>
    </article>
  );
}

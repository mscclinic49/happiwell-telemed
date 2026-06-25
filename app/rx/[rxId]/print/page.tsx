'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RxItem = {
  id: string; drug_name: string; dosage: string; frequency: string
  duration: string; instructions: string; quantity: number | null; price: number | null; sort_order: number
}
type RxData = {
  id: string; diagnosis: string | null; notes: string | null; created_at: string
  hw_rx_items: RxItem[]
  hw_appointments: {
    scheduled_at: string; symptoms: string | null
    hw_users: {
      id: string; full_name: string | null; first_name: string | null; last_name: string | null
      title: string | null; date_of_birth: string | null; blood_type: string | null
      allergies: string | null; hn: string | null; cid: string | null; insurance_type: string | null
    } | null
    hw_doctors: { full_name: string | null; license_no: string | null } | null
  } | null
}

function calcAge(dob: string | null): string {
  if (!dob) return '—'
  const d = new Date(dob), now = new Date()
  let y = now.getFullYear() - d.getFullYear()
  let m = now.getMonth() - d.getMonth()
  if (m < 0) { y--; m += 12 }
  const days = Math.floor((now.getTime() - new Date(d.getFullYear() + y, d.getMonth() + m, d.getDate()).getTime()) / 86400000)
  return `${y} ปี ${m} เดือน ${days} วัน`
}

function thaiDate(iso: string): string {
  const d = new Date(iso)
  const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function RxPrintPage() {
  const { rxId } = useParams<{ rxId: string }>()
  const [rx, setRx] = useState<RxData | null>(null)
  const [vitals, setVitals] = useState<{ cc: string | null; drug_allergy: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sb.from('hw_rx')
      .select(`id, diagnosis, notes, created_at,
        hw_rx_items(id, drug_name, dosage, frequency, duration, instructions, quantity, price, sort_order),
        hw_appointments(scheduled_at, symptoms,
          hw_users(id, full_name, first_name, last_name, title, date_of_birth, blood_type, allergies, hn, cid, insurance_type),
          hw_doctors(full_name, license_no)
        )`)
      .eq('id', rxId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const d = data as unknown as RxData
        d.hw_rx_items = [...d.hw_rx_items].sort((a, b) => a.sort_order - b.sort_order)
        setRx(d)
        const patientId = d.hw_appointments?.hw_users?.id
        if (patientId) {
          sb.from('hw_vitals').select('cc, drug_allergy')
            .eq('patient_id', patientId)
            .order('recorded_at', { ascending: false }).limit(1).maybeSingle()
            .then(({ data: v }) => { if (v) setVitals(v) })
        }
        setLoading(false)
      })
  }, [rxId])

  async function generatePdf() {
    if (!printRef.current || generating) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = canvas.width / canvas.height
      const imgH = pageW / ratio
      let y = 0
      if (imgH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH)
      } else {
        // multi-page
        while (y < imgH) {
          pdf.addImage(imgData, 'JPEG', 0, -y, pageW, imgH)
          y += pageH
          if (y < imgH) pdf.addPage()
        }
      }

      const patientName = rx?.hw_appointments?.hw_users?.first_name ?? rx?.hw_appointments?.hw_users?.full_name ?? 'rx'
      pdf.save(`ใบสั่งยา_${patientName}_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (!loading && rx) {
      setTimeout(() => generatePdf(), 600)
    }
  }, [loading, rx])

  if (loading || !rx) {
    return <div className="flex items-center justify-center h-screen text-sm text-gray-500">{'กำลังโหลด...'}</div>
  }

  const appt = rx.hw_appointments
  const patient = appt?.hw_users
  const doctor = appt?.hw_doctors
  const dt = appt ? new Date(appt.scheduled_at) : new Date(rx.created_at)
  const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const patientName = [patient?.title, patient?.first_name ?? patient?.full_name, patient?.last_name].filter(Boolean).join('')
  const allergy = vitals?.drug_allergy || patient?.allergies || ''
  const cc = vitals?.cc || appt?.symptoms || ''
  const total = rx.hw_rx_items.reduce((s, i) => s + (i.price ?? 0), 0)

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden !important; }
          #rx-print, #rx-print * { visibility: visible !important; }
          #rx-print { position: fixed; inset: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        @media screen {
          body { background: #e5e7eb; }
          #rx-print { width: 210mm; min-height: 297mm; margin: 20px auto; background: white; padding: 16mm; box-shadow: 0 4px 24px rgba(0,0,0,.15); }
        }
        * { font-family: 'Sarabun', 'TH Sarabun New', 'Noto Sans Thai', sans-serif; }
        .rx-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .rx-table th { border-bottom: 2px solid #000; padding: 4px 6px; text-align: left; font-weight: bold; }
        .rx-table td { border-bottom: 1px dashed #aaa; padding: 4px 6px; vertical-align: top; }
        .rx-table .num { text-align: center; }
        .rx-table .price { text-align: right; }
      `}</style>

      {/* Screen-only controls */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={generatePdf} disabled={generating}
          className="px-4 py-2 bg-[#1a8a6e] text-white rounded-lg text-sm font-medium shadow disabled:opacity-60 flex items-center gap-2">
          {generating
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{'กำลัง Gen PDF...'}</>
            : '⬇️ ดาวน์โหลด PDF'}
        </button>
        <button onClick={() => window.print()}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium shadow">
          {'🖨️ พิมพ์'}
        </button>
        <button onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium shadow">
          {'✕ ปิด'}
        </button>
      </div>

      <div id="rx-print" ref={printRef}>
        {/* Clinic header */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #000', paddingBottom: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{'แฮปปี้เวลล์ คลินิกเวชกรรม'}</div>
          <div style={{ fontSize: 12 }}>{'เลขที่ 193, 195 ชั้น 1 ถนนประชาอุทิศ ตำบลบางมด อำเภอทุ่งครุ กรุงเทพฯ 10140'}</div>
          <div style={{ fontSize: 11 }}>{'โทร. 02-000-4586  ใบอนุญาต: 10101035068'}</div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold', textDecoration: 'underline', margin: '6px 0 10px' }}>
          {'ใบสั่งยาผู้ป่วยนอก'}
        </div>

        {/* Patient info row 1 */}
        <table style={{ width: '100%', fontSize: 13, marginBottom: 4 }}>
          <tbody>
            <tr>
              <td style={{ width: '30%' }}><b>{'HN'}</b>{' '}{patient?.hn || '—'}</td>
              <td style={{ width: '35%' }}><b>{'วันที่'}</b>{' '}{thaiDate(rx.created_at)}</td>
              <td style={{ width: '20%' }}><b>{'เวลา'}</b>{' '}{timeStr}</td>
            </tr>
          </tbody>
        </table>

        {/* Patient info row 2 */}
        <table style={{ width: '100%', fontSize: 13, marginBottom: 2 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%' }}><b>{'ชื่อ'}</b>{' '}{patientName || '—'}</td>
              <td><b>{'อายุ'}</b>{' '}{calcAge(patient?.date_of_birth ?? null)}</td>
            </tr>
            {patient?.cid && (
              <tr>
                <td colSpan={2}><b>{'CID'}</b>{' '}{patient.cid}</td>
              </tr>
            )}
          </tbody>
        </table>

        {allergy && (
          <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>{'**ยาที่แพ้ '}{allergy}</div>
        )}

        {/* Insurance */}
        <div style={{ fontSize: 14, fontWeight: 'bold', borderTop: '2px solid #000', borderBottom: '1px solid #000', padding: '4px 0', margin: '6px 0' }}>
          {'สิทธิการรักษา: '}{patient?.insurance_type || 'ชำระเงินสด'}
        </div>

        {/* Drug table */}
        <table className="rx-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>{'Rx'}</th>
              <th>{'ชื่อยา / วิธีรับประทาน'}</th>
              <th className="num" style={{ width: 60 }}>{'จำนวน'}</th>
              <th className="price" style={{ width: 80 }}>{'รวมราคา'}</th>
            </tr>
          </thead>
          <tbody>
            {rx.hw_rx_items.map((item, idx) => {
              const sig = [item.dosage, item.frequency, item.duration].filter(Boolean).join(' ')
              return (
                <tr key={item.id}>
                  <td className="num">{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{item.drug_name}</div>
                    {sig && <div style={{ fontSize: 11.5 }}>{sig}</div>}
                    {item.instructions && <div style={{ fontSize: 11 }}>{item.instructions}</div>}
                  </td>
                  <td className="num">{item.quantity ?? '—'}</td>
                  <td className="price">{item.price != null ? item.price.toFixed(2) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Total */}
        <div style={{ textAlign: 'right', borderTop: '2px solid #000', paddingTop: 6, marginTop: 4, fontSize: 14, fontWeight: 'bold' }}>
          {'รวมมูลค่า'}{' '}{total > 0 ? `${total.toFixed(2)} บาท` : '— บาท'}
        </div>

        {/* Signatures + Diagnosis */}
        <div style={{ borderTop: '2px solid #000', marginTop: 10, paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', fontSize: 12 }}>
          <div>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: 20, marginBottom: 6 }}>
              <span style={{ fontSize: 11 }}>{'แพทย์ผู้สั่ง'}</span>
              {doctor?.full_name && (
                <div style={{ marginTop: 14, fontSize: 12, textAlign: 'center' }}>
                  {doctor.full_name}{doctor.license_no ? ` (${doctor.license_no})` : ''}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 4 }}>
              <b>{'การวินิจฉัย'}</b>{' '}{rx.diagnosis || '—'}
            </div>
          </div>
          <div>
            {[{ label: 'ผู้รับยา' }, { label: 'ผู้จัดยา' }, { label: 'ผู้จ่ายยา' }].map(r => (
              <div key={r.label} style={{ borderBottom: '1px solid #000', paddingBottom: 18, marginBottom: 6, fontSize: 11 }}>{r.label}</div>
            ))}
          </div>
        </div>

        {/* CC + notes + footer */}
        {cc && (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            <b>{'อาการสำคัญ'}</b>{' '}{cc}
          </div>
        )}
        {rx.notes && (
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <b>{'หมายเหตุ'}</b>{' '}{rx.notes}
          </div>
        )}
        <div style={{ marginTop: 16, fontSize: 11, textAlign: 'right', color: '#555' }}>{'หน้า 1 / 1'}</div>
      </div>
    </>
  )
}

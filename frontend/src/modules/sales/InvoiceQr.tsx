import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { publicInvoiceUrl } from '../../services/invoice-share.ts'
import styles from './InvoiceDocument.module.css'

/** The QR code at the bottom of an invoice. Scanning it opens the invoice on the customer's phone. */
export default function InvoiceQr({ shareCode }: { shareCode: string }) {
  const [image, setImage] = useState<string | null>(null)
  const url = publicInvoiceUrl(shareCode)

  useEffect(() => {
    let cancelled = false
    // Dark squares on white, in both themes, so a phone camera and a printer can always read it.
    QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: 'M', color: { dark: '#18181b', light: '#ffffff' } })
      .then((data) => {
        if (!cancelled) setImage(data)
      })
      .catch(() => {
        if (!cancelled) setImage(null) // the invoice is still complete without the QR code
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (image === null) return null
  return (
    <figure className={styles.qr}>
      <img src={image} width={116} height={116} alt="QR code that opens this invoice on a phone" />
      <figcaption>Scan to view this invoice on your phone</figcaption>
    </figure>
  )
}

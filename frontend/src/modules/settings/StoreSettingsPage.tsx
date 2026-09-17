import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { ApiError } from '../../services/api.ts'
import { getStoreSettings, updateStoreSettings } from '../../services/store-settings.service.ts'
import type { CurrencyCode, StoreSettings, StoreSettingsInput } from '../../types/store-settings.ts'
import { formatDateTime } from '../../utils/date.ts'
import styles from './settings.module.css'

// Same rules as backend/app/schemas/store_setting.py
const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'BDT', label: 'BDT – Bangladeshi Taka (৳)' },
  { code: 'USD', label: 'USD – US Dollar ($)' },
  { code: 'INR', label: 'INR – Indian Rupee (₹)' },
]
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_PATTERN = /^[0-9+()\- ]+$/
const INVOICE_PREFIX_PATTERN = /^[A-Za-z0-9-]+$/

type FieldErrors = Partial<Record<keyof StoreSettingsInput, string>>
type Notice = { text: string; isError?: boolean }

/** Store settings page (PRD 5.23): store details, currency, invoice prefix, loyalty and SMS. */
export default function StoreSettingsPage() {
  const formId = useId()
  const [saved, setSaved] = useState<StoreSettings | null>(null)
  const [form, setForm] = useState<StoreSettingsInput | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getStoreSettings()
      .then((settings) => {
        setSaved(settings)
        setForm(toInput(settings))
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load the store settings.'))
  }, [])

  // Hide the notice after a few seconds
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  if (loadError) return <MessagePanel title="Could not load the store settings">{loadError}</MessagePanel>
  if (!saved || !form) return <MessagePanel title="Loading store settings…" />

  const values = form
  const savedValues = toInput(saved)
  const hasChanges = JSON.stringify(values) !== JSON.stringify(savedValues)

  function change<K extends keyof StoreSettingsInput>(name: K, value: StoreSettingsInput[K]) {
    setForm({ ...values, [name]: value })
  }

  function discardChanges() {
    setForm(savedValues)
    setErrors({})
    setNotice(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setNotice({ text: 'Please fix the highlighted fields.', isError: true })
      return
    }

    setIsSaving(true)
    setNotice(null)
    try {
      const result = await updateStoreSettings(values)
      setSaved(result)
      setForm(toInput(result))
      setNotice({ text: 'Store settings saved.' })
    } catch (err) {
      setNotice({ text: err instanceof ApiError ? err.message : 'Could not save the store settings.', isError: true })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form id={formId} className={styles.page} onSubmit={handleSubmit} noValidate>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Store information</h2>
        <p className={styles.cardSub}>Shown on invoices and used across the system.</p>

        <div className={styles.twoColumns}>
          <Field id={`${formId}-name`} label="Store name" required error={errors.store_name}>
            <input
              id={`${formId}-name`}
              type="text"
              maxLength={150}
              value={values.store_name}
              onChange={(event) => change('store_name', event.target.value)}
            />
          </Field>
          <Field id={`${formId}-phone`} label="Phone" error={errors.phone}>
            <input
              id={`${formId}-phone`}
              type="tel"
              placeholder="09611-234567"
              maxLength={20}
              value={values.phone}
              onChange={(event) => change('phone', event.target.value)}
            />
          </Field>
        </div>

        <Field id={`${formId}-address`} label="Address">
          <input
            id={`${formId}-address`}
            type="text"
            placeholder="Road 12, Banani, Dhaka 1213"
            maxLength={255}
            value={values.address}
            onChange={(event) => change('address', event.target.value)}
          />
        </Field>

        <div className={styles.twoColumns}>
          <Field id={`${formId}-email`} label="Email" error={errors.email}>
            <input
              id={`${formId}-email`}
              type="email"
              placeholder="hello@store.com"
              maxLength={255}
              value={values.email}
              onChange={(event) => change('email', event.target.value)}
            />
          </Field>
          <Field id={`${formId}-currency`} label="Currency" required hint="Changing it doesn't convert prices already saved.">
            <select
              id={`${formId}-currency`}
              value={values.currency_code}
              onChange={(event) => change('currency_code', event.target.value as CurrencyCode)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className={styles.narrow}>
          <Field
            id={`${formId}-prefix`}
            label="Invoice number prefix"
            required
            error={errors.invoice_prefix}
            hint="Starts every invoice number, e.g. INV. Letters, numbers and dashes."
          >
            <input
              id={`${formId}-prefix`}
              type="text"
              maxLength={10}
              value={values.invoice_prefix}
              onChange={(event) => change('invoice_prefix', event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tax / VAT</h2>
        <p className={styles.cardSub}>VAT rates applied to purchases, sales and invoices.</p>
        <p className={styles.comingSoon}>
          VAT rates are managed on the <Link to="/settings/vat-rates">VAT Rates</Link> tab (Module 2). The default rate
          will be chosen here once that tab is built.
        </p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Loyalty program</h2>
        <p className={styles.cardSub}>Customers earn points on purchases and get tier discounts at checkout.</p>
        <Toggle
          label="Loyalty points and discounts"
          sub="Tiers and the points rule are set up under Customers → Loyalty."
          checked={values.loyalty_enabled}
          onChange={(checked) => change('loyalty_enabled', checked)}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>SMS notifications</h2>
        <p className={styles.cardSub}>An optional invoice SMS sent to the customer after a sale.</p>
        <Toggle
          label="Send invoice SMS"
          sub="A failed SMS never blocks or reverses a completed sale."
          checked={values.sms_enabled}
          onChange={(checked) => change('sms_enabled', checked)}
        />
        {values.sms_enabled && (
          <div className={`${styles.narrow} ${styles.conditional}`}>
            <Field
              id={`${formId}-sender`}
              label="Sender name"
              required
              error={errors.sms_sender_name}
              hint="What customers see as the sender, e.g. SmartRetail."
            >
              <input
                id={`${formId}-sender`}
                type="text"
                maxLength={20}
                value={values.sms_sender_name}
                onChange={(event) => change('sms_sender_name', event.target.value)}
              />
            </Field>
          </div>
        )}
      </section>

      <div className={styles.saveBar}>
        <p className={styles.lastSaved}>
          {saved.updated_at
            ? `Last saved${saved.updated_by_name ? ` by ${saved.updated_by_name}` : ''} · ${formatDateTime(saved.updated_at)}`
            : 'Not changed since setup.'}
        </p>
        {notice && (
          <p className={notice.isError ? `${styles.notice} ${styles.noticeError}` : styles.notice} role="status">
            {notice.text}
          </p>
        )}
        <span className={styles.spacer} />
        {hasChanges && (
          <button type="button" className={styles.secondaryButton} onClick={discardChanges} disabled={isSaving}>
            Discard changes
          </button>
        )}
        <button type="submit" className={styles.saveButton} disabled={!hasChanges || isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function toInput(settings: StoreSettings): StoreSettingsInput {
  return {
    store_name: settings.store_name,
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    currency_code: settings.currency_code,
    invoice_prefix: settings.invoice_prefix,
    loyalty_enabled: settings.loyalty_enabled,
    sms_enabled: settings.sms_enabled,
    sms_sender_name: settings.sms_sender_name ?? '',
  }
}

function validate(values: StoreSettingsInput): FieldErrors {
  const found: FieldErrors = {}
  if (!values.store_name.trim()) found.store_name = 'Enter the store name.'
  const phone = values.phone.trim()
  if (phone && !PHONE_PATTERN.test(phone)) found.phone = 'Use only numbers, spaces and + - ( ).'
  const email = values.email.trim()
  if (email && !EMAIL_PATTERN.test(email)) found.email = 'Enter a valid email address.'
  const prefix = values.invoice_prefix.trim()
  if (!prefix) found.invoice_prefix = 'Enter an invoice prefix.'
  else if (!INVOICE_PREFIX_PATTERN.test(prefix)) found.invoice_prefix = 'Use only letters, numbers and dashes.'
  if (values.sms_enabled && !values.sms_sender_name.trim()) found.sms_sender_name = 'Enter the sender name to turn on SMS.'
  return found
}

type FieldProps = { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }

function Field({ id, label, required = false, error, hint, children }: FieldProps) {
  return (
    <div className={error ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
      <label className={styles.label} htmlFor={id}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {error ? <p className={styles.fieldError}>{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}

type ToggleProps = { label: string; sub: string; checked: boolean; onChange: (checked: boolean) => void }

function Toggle({ label, sub, checked, onChange }: ToggleProps) {
  return (
    <label className={styles.toggleRow}>
      <span>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.toggleSub}>{sub}</span>
      </span>
      <span className={styles.switch}>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className={styles.slider} />
      </span>
    </label>
  )
}

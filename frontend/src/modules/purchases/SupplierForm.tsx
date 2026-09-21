// import { useId, useState, type FormEvent, type ReactNode } from 'react'
// import Drawer from '../../components/ui/Drawer.tsx'
// import { ApiError } from '../../services/api.ts'
// import { createSupplier, updateSupplier } from '../../services/purchasing.service.ts'
// import type { Supplier, SupplierInput } from '../../types/purchasing.ts'
// import styles from './purchasing.module.css'

// // Same rules as backend/app/schemas/supplier.py
// const PHONE_PATTERN = /^[0-9+()\- ]+$/
// const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// type SupplierFormProps = {
//   /** The supplier to edit. Leave it out to add a new one. */
//   supplier?: Supplier
//   onClose: () => void
//   onSaved: (message: string) => void
// }

// type FieldErrors = Partial<Record<'name' | 'phone' | 'email', string>>

// export default function SupplierForm({ supplier, onClose, onSaved }: SupplierFormProps) {
//   const formId = useId()
//   const [name, setName] = useState(supplier?.name ?? '')
//   const [phone, setPhone] = useState(supplier?.phone ?? '')
//   const [email, setEmail] = useState(supplier?.email ?? '')
//   const [address, setAddress] = useState(supplier?.address ?? '')
//   const [isActive, setIsActive] = useState((supplier?.status ?? 'active') === 'active')
//   const [errors, setErrors] = useState<FieldErrors>({})
//   const [saveError, setSaveError] = useState<string | null>(null)
//   const [isSaving, setIsSaving] = useState(false)

//   function validate(): FieldErrors {
//     const found: FieldErrors = {}
//     if (!name.trim()) found.name = 'Enter the supplier name.'
//     const cleanPhone = phone.trim()
//     if (!cleanPhone) found.phone = 'Enter a phone number.'
//     else if (!PHONE_PATTERN.test(cleanPhone)) found.phone = 'Use only numbers, spaces and + - ( ).'
//     const cleanEmail = email.trim()
//     if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) found.email = 'Enter a valid email address.'
//     return found
//   }

//   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault()
//     const found = validate()
//     setErrors(found)
//     setSaveError(null)
//     if (Object.keys(found).length > 0) return

//     const data: SupplierInput = {
//       name: name.trim(),
//       phone: phone.trim(),
//       email: email.trim(),
//       address: address.trim(),
//       status: isActive ? 'active' : 'inactive',
//     }
//     setIsSaving(true)
//     try {
//       const saved = supplier ? await updateSupplier(supplier.supplier_id, data) : await createSupplier(data)
//       onSaved(supplier ? `Saved changes to ${saved.name}.` : `${saved.name} was added. You can now record purchases from it.`)
//     } catch (err) {
//       setSaveError(err instanceof ApiError ? err.message : 'Could not save the supplier.')
//       setIsSaving(false)
//     }
//   }

//   return (
//     <Drawer
//       title={supplier ? 'Edit supplier' : 'Add supplier'}
//       onClose={onClose}
//       footer={
//         <>
//           <button type="button" className={styles.secondaryButton} onClick={onClose}>
//             Cancel
//           </button>
//           <button type="submit" form={formId} className={styles.saveButton} disabled={isSaving}>
//             {isSaving ? 'Saving…' : supplier ? 'Save changes' : 'Add supplier'}
//           </button>
//         </>
//       }
//     >
//       <form id={formId} onSubmit={handleSubmit} noValidate>
//         {saveError && (
//           <p className={styles.formError} role="alert">
//             {saveError}
//           </p>
//         )}

//         <Field id={`${formId}-name`} label="Supplier name" required error={errors.name}>
//           <input
//             id={`${formId}-name`}
//             type="text"
//             placeholder="e.g. ABC Traders"
//             maxLength={150}
//             value={name}
//             onChange={(event) => setName(event.target.value)}
//             autoFocus
//           />
//         </Field>

//         <div className={styles.twoColumns}>
//           <Field id={`${formId}-phone`} label="Phone" required error={errors.phone}>
//             <input
//               id={`${formId}-phone`}
//               type="tel"
//               placeholder="017XX-XXXXXX"
//               maxLength={30}
//               value={phone}
//               onChange={(event) => setPhone(event.target.value)}
//             />
//           </Field>
//           <Field id={`${formId}-email`} label="Email" error={errors.email}>
//             <input
//               id={`${formId}-email`}
//               type="email"
//               placeholder="optional"
//               maxLength={255}
//               value={email}
//               onChange={(event) => setEmail(event.target.value)}
//             />
//           </Field>
//         </div>

//         <Field id={`${formId}-address`} label="Address">
//           <input
//             id={`${formId}-address`}
//             type="text"
//             placeholder="optional"
//             maxLength={255}
//             value={address}
//             onChange={(event) => setAddress(event.target.value)}
//           />
//         </Field>

//         <label className={styles.toggleRow}>
//           <span>
//             <span className={styles.toggleLabel}>Active</span>
//             <span className={styles.toggleSub}>
//               {isActive ? 'Can be chosen for new purchases.' : 'Hidden from new purchases. Its history is kept and it can still be paid.'}
//             </span>
//           </span>
//           <span className={styles.switch}>
//             <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
//             <span className={styles.slider} />
//           </span>
//         </label>
//       </form>
//     </Drawer>
//   )
// }

// type FieldProps = { id: string; label: string; required?: boolean; error?: string; children: ReactNode }

// function Field({ id, label, required = false, error, children }: FieldProps) {
//   return (
//     <div className={error ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
//       <label className={styles.label} htmlFor={id}>
//         {label} {required && <span className={styles.required}>*</span>}
//       </label>
//       {children}
//       {error && <p className={styles.fieldError}>{error}</p>}
//     </div>
//   )
// }

















import { useId, useState, type FormEvent, type ReactNode } from 'react'
import Drawer from '../../components/ui/Drawer.tsx'
import { ApiError } from '../../services/api.ts'
import { createSupplier, updateSupplier } from '../../services/purchasing.service.ts'
import type { Supplier, SupplierInput } from '../../types/purchasing.ts'
import styles from './purchasing.module.css'

// Same rules as backend/app/schemas/supplier.py
const PHONE_PATTERN = /^[0-9+()\- ]+$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type SupplierFormProps = {
  /** The supplier to edit. Leave it out to add a new one. */
  supplier?: Supplier
  onClose: () => void
  onSaved: (message: string) => void
}

type FieldErrors = Partial<Record<'name' | 'phone' | 'email', string>>

export default function SupplierForm({ supplier, onClose, onSaved }: SupplierFormProps) {
  const formId = useId()
  const [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [address, setAddress] = useState(supplier?.address ?? '')
  const [isActive, setIsActive] = useState((supplier?.status ?? 'active') === 'active')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function validate(): FieldErrors {
    const found: FieldErrors = {}
    if (!name.trim()) found.name = 'Enter the supplier name.'
    const cleanPhone = phone.trim()
    if (!cleanPhone) found.phone = 'Enter a phone number.'
    else if (!PHONE_PATTERN.test(cleanPhone)) found.phone = 'Use only numbers, spaces and + - ( ).'
    const cleanEmail = email.trim()
    if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) found.email = 'Enter a valid email address.'
    return found
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setSaveError(null)
    if (Object.keys(found).length > 0) return

    const data: SupplierInput = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      status: isActive ? 'active' : 'inactive',
    }
    setIsSaving(true)
    try {
      const saved = supplier ? await updateSupplier(supplier.supplier_id, data) : await createSupplier(data)
      onSaved(supplier ? `Saved changes to ${saved.name}.` : `${saved.name} was added. You can now record purchases from it.`)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save the supplier.')
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={supplier ? 'Edit supplier' : 'Add supplier'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className={styles.saveButton} disabled={isSaving}>
            {isSaving ? 'Saving…' : supplier ? 'Save changes' : 'Add supplier'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        {saveError && (
          <p className={styles.formError} role="alert">
            {saveError}
          </p>
        )}

        <Field id={`${formId}-name`} label="Supplier name" required error={errors.name}>
          <input
            id={`${formId}-name`}
            type="text"
            placeholder="e.g. ABC Traders"
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </Field>

        <div className={styles.twoColumns}>
          <Field id={`${formId}-phone`} label="Phone" required error={errors.phone}>
            <input
              id={`${formId}-phone`}
              type="tel"
              placeholder="017XX-XXXXXX"
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
          <Field id={`${formId}-email`} label="Email" error={errors.email}>
            <input
              id={`${formId}-email`}
              type="email"
              placeholder="optional"
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
        </div>

        <Field id={`${formId}-address`} label="Address">
          <input
            id={`${formId}-address`}
            type="text"
            placeholder="optional"
            maxLength={255}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </Field>

        <label className={styles.toggleRow}>
          <span>
            <span className={styles.toggleLabel}>Active</span>
            <span className={styles.toggleSub}>
              {isActive ? 'Can be chosen for new purchases.' : 'Hidden from new purchases. Its history is kept and it can still be paid.'}
            </span>
          </span>
          <span className={styles.switch}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            <span className={styles.slider} />
          </span>
        </label>
      </form>
    </Drawer>
  )
}

type FieldProps = { id: string; label: string; required?: boolean; error?: string; children: ReactNode }

function Field({ id, label, required = false, error, children }: FieldProps) {
  return (
    <div className={error ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
      <label className={styles.label} htmlFor={id}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  )
}

import type { StudentFieldDefinition, PaymentFieldDefinition } from '../../types';
import { now } from './database';

/**
 * Default student field definitions.
 * Stable IDs — never change these, only labels can change.
 * Users can rename, reorder, enable/disable, or add custom fields.
 */
export function getDefaultStudentFields(): StudentFieldDefinition[] {
  const ts = now();
  return [
    // ── Basic ────────────────────────────────────────────────────────────────
    {
      id: 'student_name', label: 'Student Name', type: 'text',
      required: true, searchable: true, enabled: true,
      showInList: true, showOnReceipt: true,
      category: 'basic', order: 0,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'student_id', label: 'Student ID', type: 'text',
      required: false, searchable: true, enabled: true,
      showInList: true, showOnReceipt: false,
      category: 'basic', order: 1,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'date_of_birth', label: 'Date of Birth', type: 'date',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'basic', order: 2,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'gender', label: 'Gender', type: 'select',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'basic', order: 3,
      options: [
        { id: 'male',   label: 'Male',   value: 'male' },
        { id: 'female', label: 'Female', value: 'female' },
        { id: 'other',  label: 'Other',  value: 'other' },
      ],
      createdAt: ts, updatedAt: ts,
    },

    // ── Parent / Guardian ────────────────────────────────────────────────────
    {
      id: 'father_name', label: "Father's Name", type: 'text',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'parent', order: 10,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'mother_name', label: "Mother's Name", type: 'text',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'parent', order: 11,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'guardian_name', label: 'Guardian Name', type: 'text',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'parent', order: 12,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'parent_phone', label: 'Parent Phone', type: 'phone',
      required: false, searchable: true, enabled: true,
      showInList: true, showOnReceipt: false,
      category: 'parent', order: 13,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'whatsapp_number', label: 'WhatsApp Number', type: 'phone',
      required: false, searchable: true, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'parent', order: 14,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'alternate_phone', label: 'Alternate Phone', type: 'phone',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'parent', order: 15,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'parent_email', label: 'Parent Email', type: 'email',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'parent', order: 16,
      createdAt: ts, updatedAt: ts,
    },

    // ── Academic ─────────────────────────────────────────────────────────────
    {
      id: 'school_name', label: 'School / College Name', type: 'text',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'academic', order: 20,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'class_grade', label: 'Class / Grade', type: 'text',
      required: false, searchable: false, enabled: true,
      showInList: true, showOnReceipt: true,
      category: 'academic', order: 21,
      createdAt: ts, updatedAt: ts,
    },

    // ── Tuition / Membership ─────────────────────────────────────────────────
    {
      id: 'admission_date', label: 'Admission Date', type: 'date',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'tuition', order: 30,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'membership_expiry', label: 'Membership Expiry Date', type: 'date',
      required: false, searchable: false, enabled: true,
      showInList: true, showOnReceipt: false,
      category: 'tuition', order: 31,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'fee_amount', label: 'Fee Amount', type: 'currency',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'tuition', order: 32,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'fee_frequency', label: 'Fee Frequency', type: 'select',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'tuition', order: 33,
      options: [
        { id: 'monthly',     label: 'Monthly',      value: 'monthly' },
        { id: 'quarterly',   label: 'Quarterly',    value: 'quarterly' },
        { id: 'halfYearly',  label: 'Half-Yearly',  value: 'halfYearly' },
        { id: 'yearly',      label: 'Annually',     value: 'yearly' },
        { id: 'oneTime',     label: 'One-Time',     value: 'oneTime' },
        { id: 'instalment2', label: '2 Instalments',value: 'instalment2' },
        { id: 'instalment3', label: '3 Instalments',value: 'instalment3' },
        { id: 'custom',      label: 'Custom',       value: 'custom' },
      ],
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'fee_due_date', label: 'Fee Due Date (Day of Month)', type: 'number',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'tuition', order: 34,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'discount', label: 'Discount', type: 'currency',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'tuition', order: 35,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'student_status', label: 'Status', type: 'select',
      required: false, searchable: false, enabled: true,
      showInList: true, showOnReceipt: false,
      category: 'tuition', order: 36,
      defaultValue: 'active',
      options: [
        { id: 'active',    label: 'Active',    value: 'active' },
        { id: 'inactive',  label: 'Inactive',  value: 'inactive' },
        { id: 'completed', label: 'Completed', value: 'completed' },
      ],
      createdAt: ts, updatedAt: ts,
    },

    // ── Contact / Additional ─────────────────────────────────────────────────
    {
      id: 'address', label: 'Address', type: 'longText',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'contact', order: 40,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'city', label: 'City', type: 'text',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'contact', order: 41,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'pincode', label: 'Pincode', type: 'text',
      required: false, searchable: false, enabled: false,
      showInList: false, showOnReceipt: false,
      category: 'contact', order: 42,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'notes', label: 'Notes', type: 'longText',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'contact', order: 43,
      createdAt: ts, updatedAt: ts,
    },
  ];
}

/**
 * Default payment field definitions.
 */
export function getDefaultPaymentFields(): PaymentFieldDefinition[] {
  const ts = now();
  return [
    {
      id: 'payment_amount',  label: 'Amount',       type: 'currency',
      required: true,  searchable: false, enabled: true,
      showInList: true, showOnReceipt: true,
      category: 'payment', order: 0,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'payment_mode',    label: 'Payment Mode', type: 'select',
      required: true,  searchable: false, enabled: true,
      showInList: true, showOnReceipt: true,
      category: 'payment', order: 1,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'payment_date',    label: 'Payment Date', type: 'date',
      required: true,  searchable: false, enabled: true,
      showInList: true, showOnReceipt: true,
      category: 'payment', order: 2,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'payment_purpose', label: 'Purpose / Period', type: 'text',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: true,
      category: 'payment', order: 3,
      createdAt: ts, updatedAt: ts,
    },
    {
      id: 'payment_notes',   label: 'Notes',        type: 'longText',
      required: false, searchable: false, enabled: true,
      showInList: false, showOnReceipt: false,
      category: 'payment', order: 4,
      createdAt: ts, updatedAt: ts,
    },
  ];
}

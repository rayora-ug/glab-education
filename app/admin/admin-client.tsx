'use client'

import { useEffect, useState } from 'react'
import {
  Lock, ShieldX, Search, Ban, CheckCircle, Power,
  ExternalLink, RefreshCw, LogOut, Loader2, Star, PlusCircle,
  UserPlus, XCircle, Settings, Megaphone, Flag, Trash2, Mail, AlertTriangle,
} from 'lucide-react'
import { REVIEW_LEVELS } from '../portal/shared'
import coursesData from '../../data/courses.json'

const a1Batches = (coursesData as any[])
  .filter(c => c.level === 'A1' && c.registrationOpen)
  .flatMap((c: any) => (c.batches || []).map((b: any) => ({
    id: b.id, label: `${c.title} — ${b.label}`,
  })))

// The Registrations sheet is permanent and cumulative across every past
// session (never cleared — see apps-script/README.md), so a plain "A2
// Morning" count would mix the current batch in with every old one that
// happens to share the same Morning/Evening slot. Restrict batch counts to
// only the batch ids currently open in courses.json.
const currentBatchIds = new Set(
  (coursesData as any[])
    .filter(c => c.registrationOpen)
    .flatMap((c: any) => (c.batches || []).map((b: any) => b.id))
)

const ANNOUNCEMENT_CATEGORIES = ['Course Registration', 'Events', 'Workshops', 'Exam Preparation', 'General Updates']

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'registrations', label: 'Registrations' },
  { id: 'a1', label: 'A1 Pipeline' },
  { id: 'crm', label: 'CRM' },
  { id: 'batches', label: 'Batches' },
  { id: 'finance', label: 'Finance' },
  { id: 'content', label: 'Content' },
] as const
type AdminTab = (typeof ADMIN_TABS)[number]['id']

type Student = {
  found: boolean
  glabId?: string
  name?: string
  eligibleCourses?: string[]
  blocked?: boolean
  registration?: { course: string; batchId: string; status: string } | null
}

type PendingRegistration = {
  timestamp: string
  glabId: string
  name: string
  course: string
  batchId: string
  paymentMethod: string
  paymentReference: string
  proofFileLink: string
  feedback: string
}

type AllRegistration = {
  glabId: string
  name: string
  course: string
  batchId: string
  status: string
}

// batchId follows "{level}-{num}-{M|E}" (e.g. "a2-38-M") — derive a
// human label from it rather than the free-text course string, which
// varies in wording.
function batchLabelFromId(batchId: string): string {
  const m = batchId.match(/^(a1|a2|b1)-\d+-(m|e)$/i)
  if (!m) return 'Other'
  return `${m[1].toUpperCase()} ${m[2].toLowerCase() === 'm' ? 'Morning' : 'Evening'}`
}

type CRMEntry = {
  glabId: string
  name: string
  email: string
  phone: string
  segment: string
  highestLevel: string
  lastCourse: string
  lastStatus: string
  lastActivity: string | null
}

type Batch = {
  batchId: string
  whatsappLink: string
  classroomLink: string
  meetLink: string
  startDate: string
  endDate: string
  confirmedCount: number
}

type FinanceEntry = {
  row: number
  date: string
  glabId: string
  name: string
  course: string
  session: string
  courseFee: number
  amountPaid: number
  discount: number
  due: number
  location: string
  paymentAccount: string
  paymentReference: string
  notes: string
}

type FinanceExpense = {
  row: number
  date: string
  description: string
  amount: number
  location: string
  paidFrom: string
  session: string
}

type FinanceSession = {
  sessionCode: string
  startDate: string
  endDate: string
}

type Application = {
  row: number
  name: string
  email: string
  phone: string
  dob: string
  facebookLink: string
  occupation: string
  city: string
  batchChoice: string
  previousExperience: string
  previousCourseDetails: string
  previousCourseCompleted: string
  motivation: string
  whyGlab: string
  howHeard: string
  primaryGoal: string
  comment: string
  note: string
  flagged: boolean
  status: 'pending' | 'selected' | 'not_selected'
  glabId: string
  confirmedBatch: string
  timestamp: string | null
}

type CleanupRowSummary = {
  row: number
  name: string
  email: string
  phone: string
  status: string
  timestamp: string | null
}

type DuplicateGroup = {
  key: string
  keepRow: number
  rows: CleanupRowSummary[]
}

type PendingReview = {
  row: number
  name: string
  location: string
  rating: number | null
  date: string
  course: string
  text: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [checkingSession, setCheckingSession] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null)
  const [togglingRegistration, setTogglingRegistration] = useState(false)
  const [a1ApplicationOpen, setA1ApplicationOpen] = useState<boolean | null>(null)
  const [togglingA1Application, setTogglingA1Application] = useState(false)

  const [glabIdQuery, setGlabIdQuery] = useState('')
  const [studentResult, setStudentResult] = useState<Student | null>(null)
  const [studentError, setStudentError] = useState('')
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [togglingBlock, setTogglingBlock] = useState(false)

  const [pending, setPending] = useState<PendingRegistration[] | null>(null)
  const [pendingError, setPendingError] = useState('')
  const [loadingPending, setLoadingPending] = useState(false)
  const [confirmingKey, setConfirmingKey] = useState('')
  const [pendingBatchFilter, setPendingBatchFilter] = useState('All')

  const [allRegistrations, setAllRegistrations] = useState<AllRegistration[] | null>(null)
  const [allRegistrationsError, setAllRegistrationsError] = useState('')
  const [loadingAllRegistrations, setLoadingAllRegistrations] = useState(false)
  const [registrationBatchFilter, setRegistrationBatchFilter] = useState('All')

  const [crm, setCrm] = useState<CRMEntry[] | null>(null)
  const [crmError, setCrmError] = useState('')
  const [loadingCrm, setLoadingCrm] = useState(false)
  const [crmSegmentFilter, setCrmSegmentFilter] = useState('All')
  const [crmSearch, setCrmSearch] = useState('')
  const [outreachSubject, setOutreachSubject] = useState('')
  const [outreachBody, setOutreachBody] = useState('')
  const [outreachConfirming, setOutreachConfirming] = useState(false)
  const [sendingOutreach, setSendingOutreach] = useState(false)
  const [outreachResult, setOutreachResult] = useState('')
  const [outreachError, setOutreachError] = useState('')
  const [testName, setTestName] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [testError, setTestError] = useState('')

  const [batches, setBatches] = useState<Batch[] | null>(null)
  const [batchesError, setBatchesError] = useState('')
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [batchForm, setBatchForm] = useState({ batchId: '', whatsappLink: '', classroomLink: '', meetLink: '', startDate: '', endDate: '' })
  const [showAddBatch, setShowAddBatch] = useState(false)
  const [savingBatch, setSavingBatch] = useState(false)
  const [batchFormError, setBatchFormError] = useState('')

  const [finance, setFinance] = useState<FinanceEntry[] | null>(null)
  const [financeError, setFinanceError] = useState('')
  const [loadingFinance, setLoadingFinance] = useState(false)
  const [financeSessionFilter, setFinanceSessionFilter] = useState('All')
  const [editingFinanceRow, setEditingFinanceRow] = useState<number | null>(null)
  const [financeEntryForm, setFinanceEntryForm] = useState({ courseFee: '', amountPaid: '', discount: '', location: '', paymentAccount: '', paymentReference: '', notes: '' })
  const [savingFinanceEntry, setSavingFinanceEntry] = useState(false)

  const [financeExpenses, setFinanceExpenses] = useState<FinanceExpense[] | null>(null)
  const [expenseForm, setExpenseForm] = useState({ date: '', description: '', amount: '', location: '', paidFrom: '' })
  const [savingExpense, setSavingExpense] = useState(false)
  const [expenseError, setExpenseError] = useState('')

  const [financeSessions, setFinanceSessions] = useState<FinanceSession[] | null>(null)
  const [showAddSession, setShowAddSession] = useState(false)
  const [sessionForm, setSessionForm] = useState({ sessionCode: '', startDate: '', endDate: '' })
  const [editingSessionCode, setEditingSessionCode] = useState<string | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionFormError, setSessionFormError] = useState('')

  const [openingBD, setOpeningBD] = useState<number | null>(null)
  const [openingDE, setOpeningDE] = useState<number | null>(null)
  const [openingForm, setOpeningForm] = useState({ openingBD: '', openingDE: '' })
  const [savingOpening, setSavingOpening] = useState(false)

  const [confirmDeleteFinanceRow, setConfirmDeleteFinanceRow] = useState<number | null>(null)
  const [deletingFinanceRow, setDeletingFinanceRow] = useState<number | null>(null)
  const [confirmDeleteExpenseRow, setConfirmDeleteExpenseRow] = useState<number | null>(null)
  const [deletingExpenseRow, setDeletingExpenseRow] = useState<number | null>(null)
  const [confirmDeleteSessionCode, setConfirmDeleteSessionCode] = useState<string | null>(null)
  const [deletingSessionCode, setDeletingSessionCode] = useState<string | null>(null)

  const [reviewName, setReviewName] = useState('')
  const [reviewLocation, setReviewLocation] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reviewLevel, setReviewLevel] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewOutcome, setReviewOutcome] = useState('')
  const [reviewFeatured, setReviewFeatured] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementExcerpt, setAnnouncementExcerpt] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [announcementDate, setAnnouncementDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [announcementCategory, setAnnouncementCategory] = useState('Course Registration')
  const [announcementImportant, setAnnouncementImportant] = useState(true)
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false)
  const [announcementError, setAnnouncementError] = useState('')
  const [announcementSuccess, setAnnouncementSuccess] = useState('')

  const [applications, setApplications] = useState<Application[] | null>(null)
  const [applicationsError, setApplicationsError] = useState('')
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [applicationBatch, setApplicationBatch] = useState<Record<string, string>>({})
  const [applicationActionKey, setApplicationActionKey] = useState('')
  const [showDecidedApplications, setShowDecidedApplications] = useState(false)
  const [applicationBatchFilter, setApplicationBatchFilter] = useState('All')
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})
  const [flaggedDrafts, setFlaggedDrafts] = useState<Record<number, boolean>>({})
  const [savingNoteRow, setSavingNoteRow] = useState<number | null>(null)

  const [cleanup, setCleanup] = useState<{ corruptRows: CleanupRowSummary[]; duplicateGroups: DuplicateGroup[] } | null>(null)
  const [loadingCleanup, setLoadingCleanup] = useState(false)
  const [cleanupError, setCleanupError] = useState('')
  const [cleanupSelection, setCleanupSelection] = useState<Record<number, boolean>>({})
  const [applyingCleanup, setApplyingCleanup] = useState(false)
  const [cleanupSuccess, setCleanupSuccess] = useState('')

  const [idPrefix, setIdPrefix] = useState('')
  const [idPrefixInput, setIdPrefixInput] = useState('')
  const [idNextSeq, setIdNextSeq] = useState('')
  const [idNextSeqInput, setIdNextSeqInput] = useState('')
  const [savingIdPrefix, setSavingIdPrefix] = useState(false)

  const [pendingReviews, setPendingReviews] = useState<PendingReview[] | null>(null)
  const [pendingReviewsError, setPendingReviewsError] = useState('')
  const [loadingPendingReviews, setLoadingPendingReviews] = useState(false)
  const [approvingReviewRow, setApprovingReviewRow] = useState<number | null>(null)
  const [confirmDeleteReviewRow, setConfirmDeleteReviewRow] = useState<number | null>(null)
  const [deletingReviewRow, setDeletingReviewRow] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/session').then(r => r.json()).then(d => {
      setAuthenticated(!!d.authenticated)
      setCheckingSession(false)
    })
  }, [])

  useEffect(() => {
    if (!authenticated) return
    fetch('/api/registration-status').then(r => r.json()).then(d => {
      if (d.success) setRegistrationOpen(d.open)
    })
    fetch('/api/a1-application-status').then(r => r.json()).then(d => {
      if (d.success) setA1ApplicationOpen(d.open)
    })
    loadPending()
    loadAllRegistrations()
    loadPendingReviews()
    loadApplications()
    loadIdPrefix()
  }, [authenticated])

  // CRM scans the full Students/Registrations/Applications history, so
  // it's loaded lazily on first visit to the tab rather than eagerly with
  // everything else above — no point paying that cost on every login if
  // admin never opens it this session.
  useEffect(() => {
    if (activeTab === 'crm' && crm === null && !loadingCrm) loadCrm()
  }, [activeTab, crm, loadingCrm])

  useEffect(() => {
    if (activeTab === 'batches' && batches === null && !loadingBatches) loadBatches()
  }, [activeTab, batches, loadingBatches])

  useEffect(() => {
    if (activeTab !== 'finance' || finance !== null || loadingFinance) return
    loadFinance()
    loadFinanceExpenses()
    loadFinanceSessions()
    loadOpeningBalance()
  }, [activeTab, finance, loadingFinance])

  const handleLogin = async () => {
    if (!password) return
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Login failed.')
      setAuthenticated(true)
      setPassword('')
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthenticated(false)
    setStudentResult(null)
    setPending(null)
    setAllRegistrations(null)
    setCrm(null)
    setPendingReviews(null)
    setApplications(null)
    setIdPrefix('')
    setIdNextSeq('')
  }

  const toggleRegistration = async () => {
    if (registrationOpen === null) return
    setTogglingRegistration(true)
    try {
      const res = await fetch('/api/admin/registration-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: !registrationOpen }),
      })
      const data = await res.json()
      if (data.success) setRegistrationOpen(data.open)
    } finally {
      setTogglingRegistration(false)
    }
  }

  const toggleA1Application = async () => {
    if (a1ApplicationOpen === null) return
    setTogglingA1Application(true)
    try {
      const res = await fetch('/api/admin/a1-application-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: !a1ApplicationOpen }),
      })
      const data = await res.json()
      if (data.success) setA1ApplicationOpen(data.open)
    } finally {
      setTogglingA1Application(false)
    }
  }

  const searchStudent = async () => {
    if (!glabIdQuery.trim()) return
    setSearchingStudent(true)
    setStudentError('')
    setStudentResult(null)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: glabIdQuery }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Search failed.')
      if (!data.found) {
        setStudentError('No student found with that GLAB ID.')
        return
      }
      setStudentResult(data)
    } catch (err: any) {
      setStudentError(err.message || 'Search failed.')
    } finally {
      setSearchingStudent(false)
    }
  }

  const toggleBlock = async () => {
    if (!studentResult?.glabId) return
    setTogglingBlock(true)
    try {
      const res = await fetch('/api/admin/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: studentResult.glabId, blocked: !studentResult.blocked }),
      })
      const data = await res.json()
      if (data.success) setStudentResult({ ...studentResult, blocked: data.blocked })
    } finally {
      setTogglingBlock(false)
    }
  }

  const loadPending = async () => {
    setLoadingPending(true)
    setPendingError('')
    try {
      const res = await fetch('/api/admin/registrations/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setPending(data.registrations)
      else setPendingError(data.error || 'Failed to load pending registrations.')
    } catch {
      setPendingError('Failed to load pending registrations.')
    } finally {
      setLoadingPending(false)
    }
  }

  const loadAllRegistrations = async () => {
    setLoadingAllRegistrations(true)
    setAllRegistrationsError('')
    try {
      const res = await fetch('/api/admin/registrations/all', { method: 'POST' })
      const data = await res.json()
      if (data.success) setAllRegistrations(data.registrations)
      else setAllRegistrationsError(data.error || 'Failed to load registrations.')
    } catch {
      setAllRegistrationsError('Failed to load registrations.')
    } finally {
      setLoadingAllRegistrations(false)
    }
  }

  const loadCrm = async () => {
    setLoadingCrm(true)
    setCrmError('')
    try {
      const res = await fetch('/api/admin/crm', { method: 'POST' })
      const data = await res.json()
      if (data.success) setCrm(data.students)
      else setCrmError(data.error || 'Failed to load the student database.')
    } catch {
      setCrmError('Failed to load the student database.')
    } finally {
      setLoadingCrm(false)
    }
  }

  const loadBatches = async () => {
    setLoadingBatches(true)
    setBatchesError('')
    try {
      const res = await fetch('/api/admin/batches', { method: 'POST' })
      const data = await res.json()
      if (data.success) setBatches(data.batches)
      else setBatchesError(data.error || 'Failed to load batches.')
    } catch {
      setBatchesError('Failed to load batches.')
    } finally {
      setLoadingBatches(false)
    }
  }

  const startAddBatch = () => {
    setEditingBatchId(null)
    setBatchForm({ batchId: '', whatsappLink: '', classroomLink: '', meetLink: '', startDate: '', endDate: '' })
    setBatchFormError('')
    setShowAddBatch(true)
  }

  const startEditBatch = (b: Batch) => {
    setEditingBatchId(b.batchId)
    setBatchForm({
      batchId: b.batchId, whatsappLink: b.whatsappLink, classroomLink: b.classroomLink,
      meetLink: b.meetLink, startDate: b.startDate, endDate: b.endDate,
    })
    setBatchFormError('')
    setShowAddBatch(true)
  }

  const saveBatch = async () => {
    if (!batchForm.batchId.trim()) return
    setSavingBatch(true)
    setBatchFormError('')
    try {
      const res = await fetch(editingBatchId ? '/api/admin/batches/update' : '/api/admin/batches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchForm),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save batch.')
      setShowAddBatch(false)
      setEditingBatchId(null)
      loadBatches()
    } catch (err: any) {
      setBatchFormError(err.message || 'Failed to save batch.')
    } finally {
      setSavingBatch(false)
    }
  }

  const loadFinance = async () => {
    setLoadingFinance(true)
    setFinanceError('')
    try {
      const res = await fetch('/api/admin/finance', { method: 'POST' })
      const data = await res.json()
      if (data.success) setFinance(data.entries)
      else setFinanceError(data.error || 'Failed to load Finance entries.')
    } catch {
      setFinanceError('Failed to load Finance entries.')
    } finally {
      setLoadingFinance(false)
    }
  }

  const loadFinanceExpenses = async () => {
    const res = await fetch('/api/admin/finance/expenses', { method: 'POST' })
    const data = await res.json()
    if (data.success) setFinanceExpenses(data.expenses)
  }

  const loadFinanceSessions = async () => {
    const res = await fetch('/api/admin/finance/sessions', { method: 'POST' })
    const data = await res.json()
    if (data.success) setFinanceSessions(data.sessions)
  }

  const loadOpeningBalance = async () => {
    const res = await fetch('/api/admin/finance/opening-balance', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setOpeningBD(data.openingBD)
      setOpeningDE(data.openingDE)
      setOpeningForm({ openingBD: String(data.openingBD), openingDE: String(data.openingDE) })
    }
  }

  const startEditFinanceEntry = (e: FinanceEntry) => {
    setEditingFinanceRow(e.row)
    setFinanceEntryForm({
      courseFee: String(e.courseFee || ''), amountPaid: String(e.amountPaid || ''), discount: String(e.discount || ''),
      location: e.location, paymentAccount: e.paymentAccount, paymentReference: e.paymentReference, notes: e.notes,
    })
  }

  const saveFinanceEntry = async () => {
    if (!editingFinanceRow) return
    setSavingFinanceEntry(true)
    try {
      const res = await fetch('/api/admin/finance/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row: editingFinanceRow,
          courseFee: Number(financeEntryForm.courseFee) || 0,
          amountPaid: Number(financeEntryForm.amountPaid) || 0,
          discount: Number(financeEntryForm.discount) || 0,
          location: financeEntryForm.location,
          paymentAccount: financeEntryForm.paymentAccount,
          paymentReference: financeEntryForm.paymentReference,
          notes: financeEntryForm.notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditingFinanceRow(null)
        loadFinance()
      }
    } finally {
      setSavingFinanceEntry(false)
    }
  }

  const addExpense = async () => {
    if (!expenseForm.description.trim() || !expenseForm.amount) return
    setSavingExpense(true)
    setExpenseError('')
    try {
      const res = await fetch('/api/admin/finance/expenses/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to add expense.')
      setExpenseForm({ date: '', description: '', amount: '', location: '', paidFrom: '' })
      loadFinanceExpenses()
    } catch (err: any) {
      setExpenseError(err.message || 'Failed to add expense.')
    } finally {
      setSavingExpense(false)
    }
  }

  const startAddSession = () => {
    setEditingSessionCode(null)
    setSessionForm({ sessionCode: '', startDate: '', endDate: '' })
    setSessionFormError('')
    setShowAddSession(true)
  }

  const startEditSession = (s: FinanceSession) => {
    setEditingSessionCode(s.sessionCode)
    setSessionForm({ sessionCode: s.sessionCode, startDate: s.startDate, endDate: s.endDate })
    setSessionFormError('')
    setShowAddSession(true)
  }

  const saveSession = async () => {
    if (!sessionForm.sessionCode.trim() || !sessionForm.startDate || !sessionForm.endDate) return
    setSavingSession(true)
    setSessionFormError('')
    try {
      const res = await fetch(editingSessionCode ? '/api/admin/finance/sessions/update' : '/api/admin/finance/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionForm),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save session.')
      setShowAddSession(false)
      setEditingSessionCode(null)
      loadFinanceSessions()
    } catch (err: any) {
      setSessionFormError(err.message || 'Failed to save session.')
    } finally {
      setSavingSession(false)
    }
  }

  const saveOpeningBalance = async () => {
    setSavingOpening(true)
    try {
      const res = await fetch('/api/admin/finance/opening-balance/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBD: Number(openingForm.openingBD) || 0, openingDE: Number(openingForm.openingDE) || 0 }),
      })
      const data = await res.json()
      if (data.success) {
        setOpeningBD(data.success ? Number(openingForm.openingBD) || 0 : openingBD)
        setOpeningDE(data.success ? Number(openingForm.openingDE) || 0 : openingDE)
      }
    } finally {
      setSavingOpening(false)
    }
  }

  const deleteFinanceEntry = async (row: number) => {
    setDeletingFinanceRow(row)
    try {
      const res = await fetch('/api/admin/finance/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row }),
      })
      const data = await res.json()
      if (data.success) setFinance(prev => (prev || []).filter(e => e.row !== row))
    } finally {
      setDeletingFinanceRow(null)
      setConfirmDeleteFinanceRow(null)
    }
  }

  const deleteExpense = async (row: number) => {
    setDeletingExpenseRow(row)
    try {
      const res = await fetch('/api/admin/finance/expenses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row }),
      })
      const data = await res.json()
      if (data.success) setFinanceExpenses(prev => (prev || []).filter(e => e.row !== row))
    } finally {
      setDeletingExpenseRow(null)
      setConfirmDeleteExpenseRow(null)
    }
  }

  const deleteSession = async (sessionCode: string) => {
    setDeletingSessionCode(sessionCode)
    try {
      const res = await fetch('/api/admin/finance/sessions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode }),
      })
      const data = await res.json()
      if (data.success) setFinanceSessions(prev => (prev || []).filter(s => s.sessionCode !== sessionCode))
    } finally {
      setDeletingSessionCode(null)
      setConfirmDeleteSessionCode(null)
    }
  }

  const sendOutreach = async (recipients: { name: string; email: string }[]) => {
    setSendingOutreach(true)
    setOutreachError('')
    setOutreachResult('')
    try {
      const res = await fetch('/api/admin/crm/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject: outreachSubject, messageBody: outreachBody }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to send.')
      setOutreachResult(`Sent ${data.sent}${data.failed ? `, ${data.failed} failed` : ''}.`)
      setOutreachSubject('')
      setOutreachBody('')
    } catch (err: any) {
      setOutreachError(err.message || 'Failed to send.')
    } finally {
      setSendingOutreach(false)
      setOutreachConfirming(false)
    }
  }

  const sendTestOutreach = async () => {
    setSendingTest(true)
    setTestError('')
    setTestResult('')
    try {
      const res = await fetch('/api/admin/crm/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ name: testName.trim(), email: testEmail.trim() }],
          subject: outreachSubject,
          messageBody: outreachBody,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to send.')
      if (data.failed) throw new Error((data.errors && data.errors[0]) || 'Send failed.')
      setTestResult(`Test sent to ${testEmail.trim()}.`)
    } catch (err: any) {
      setTestError(err.message || 'Failed to send.')
    } finally {
      setSendingTest(false)
    }
  }

  const confirmRegistration = async (reg: PendingRegistration) => {
    const key = reg.glabId + reg.timestamp
    setConfirmingKey(key)
    try {
      const res = await fetch('/api/admin/registrations/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: reg.glabId, timestamp: reg.timestamp }),
      })
      const data = await res.json()
      if (data.success) {
        setPending(prev => (prev || []).filter(r => r.glabId + r.timestamp !== key))
      }
    } finally {
      setConfirmingKey('')
    }
  }

  const loadApplications = async () => {
    setLoadingApplications(true)
    setApplicationsError('')
    try {
      const res = await fetch('/api/admin/applications/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setApplications(data.applications)
      else setApplicationsError(data.error || 'Failed to load applications.')
    } catch {
      setApplicationsError('Failed to load applications.')
    } finally {
      setLoadingApplications(false)
    }
  }

  const loadIdPrefix = async () => {
    try {
      const res = await fetch('/api/admin/applications/id-prefix')
      const data = await res.json()
      if (data.success) {
        setIdPrefix(data.prefix || '')
        setIdPrefixInput(data.prefix || '')
        setIdNextSeq(data.nextSeq || '')
        setIdNextSeqInput(data.nextSeq || '')
      }
    } catch {
      // Non-critical — Select will just surface the "set a prefix first" error.
    }
  }

  const saveIdPrefix = async () => {
    if (!idPrefixInput.trim() || !idNextSeqInput.trim()) return
    setSavingIdPrefix(true)
    try {
      const res = await fetch('/api/admin/applications/id-prefix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: idPrefixInput.trim(), nextSeq: Number(idNextSeqInput) }),
      })
      const data = await res.json()
      if (data.success) {
        setIdPrefix(idPrefixInput.trim().toUpperCase())
        setIdNextSeq(idNextSeqInput.trim())
      }
    } finally {
      setSavingIdPrefix(false)
    }
  }

  const applicationKey = (app: Application) => app.email + app.phone

  const selectApplicant = async (app: Application) => {
    const batchId = applicationBatch[applicationKey(app)]
    if (!batchId) return
    const batch = a1Batches.find(b => b.id === batchId)
    const key = applicationKey(app)
    setApplicationActionKey(key)
    try {
      const res = await fetch('/api/admin/applications/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: app.email, phone: app.phone, batchLabel: batch?.label || '', batchId }),
      })
      const data = await res.json()
      if (data.success) {
        setApplications(prev => (prev || []).map(a => a === app
          ? { ...a, status: 'selected', glabId: data.glabId || a.glabId, confirmedBatch: batch?.label || a.confirmedBatch }
          : a))
        // The backend's counter already advanced — mirror that locally so
        // the "Next ID will be" preview stays correct without a refetch.
        setIdNextSeq(prev => prev ? String(Number(prev) + 1) : prev)
        setIdNextSeqInput(prev => prev ? String(Number(prev) + 1) : prev)
      } else {
        setApplicationsError(data.error || 'Failed to select applicant.')
      }
    } finally {
      setApplicationActionKey('')
    }
  }

  const rejectApplicant = async (app: Application) => {
    const key = applicationKey(app)
    setApplicationActionKey(key)
    try {
      const res = await fetch('/api/admin/applications/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: app.email, phone: app.phone }),
      })
      const data = await res.json()
      if (data.success) {
        setApplications(prev => (prev || []).map(a => a === app ? { ...a, status: 'not_selected' } : a))
      } else {
        setApplicationsError(data.error || 'Failed to reject applicant.')
      }
    } finally {
      setApplicationActionKey('')
    }
  }

  const saveApplicationNote = async (app: Application) => {
    const note = noteDrafts[app.row] ?? app.note
    const flagged = flaggedDrafts[app.row] ?? app.flagged
    setSavingNoteRow(app.row)
    try {
      const res = await fetch('/api/admin/applications/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: app.row, note, flagged }),
      })
      const data = await res.json()
      if (data.success) {
        setApplications(prev => (prev || []).map(a => a.row === app.row ? { ...a, note, flagged } : a))
      }
    } finally {
      setSavingNoteRow(null)
    }
  }

  const loadCleanupPreview = async () => {
    setLoadingCleanup(true)
    setCleanupError('')
    setCleanupSuccess('')
    try {
      const res = await fetch('/api/admin/applications/cleanup/preview', { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to scan for duplicates.')
      setCleanup({ corruptRows: data.corruptRows, duplicateGroups: data.duplicateGroups })
      // Pre-check corrupt rows and every non-keeper in each duplicate group.
      const preselect: Record<number, boolean> = {}
      data.corruptRows.forEach((r: CleanupRowSummary) => { preselect[r.row] = true })
      data.duplicateGroups.forEach((g: DuplicateGroup) => {
        g.rows.forEach(r => { if (r.row !== g.keepRow) preselect[r.row] = true })
      })
      setCleanupSelection(preselect)
    } catch (err: any) {
      setCleanupError(err.message || 'Failed to scan for duplicates.')
    } finally {
      setLoadingCleanup(false)
    }
  }

  const applyCleanup = async () => {
    const rows = Object.keys(cleanupSelection).filter(r => cleanupSelection[Number(r)]).map(Number)
    if (rows.length === 0) return
    setApplyingCleanup(true)
    setCleanupError('')
    try {
      const res = await fetch('/api/admin/applications/cleanup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to delete rows.')
      setCleanupSuccess(`Deleted ${data.deleted} row${data.deleted === 1 ? '' : 's'}.`)
      setCleanup(null)
      setCleanupSelection({})
      loadApplications()
    } catch (err: any) {
      setCleanupError(err.message || 'Failed to delete rows.')
    } finally {
      setApplyingCleanup(false)
    }
  }

  const loadPendingReviews = async () => {
    setLoadingPendingReviews(true)
    setPendingReviewsError('')
    try {
      const res = await fetch('/api/admin/reviews/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setPendingReviews(data.reviews)
      else setPendingReviewsError(data.error || 'Failed to load pending reviews.')
    } catch {
      setPendingReviewsError('Failed to load pending reviews.')
    } finally {
      setLoadingPendingReviews(false)
    }
  }

  const approvePendingReview = async (row: number) => {
    setApprovingReviewRow(row)
    try {
      const res = await fetch('/api/admin/reviews/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row }),
      })
      const data = await res.json()
      if (data.success) {
        setPendingReviews(prev => (prev || []).filter(r => r.row !== row))
      }
    } finally {
      setApprovingReviewRow(null)
    }
  }

  const deletePendingReview = async (row: number) => {
    setDeletingReviewRow(row)
    try {
      const res = await fetch('/api/admin/reviews/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row }),
      })
      const data = await res.json()
      if (data.success) {
        setPendingReviews(prev => (prev || []).filter(r => r.row !== row))
      }
    } finally {
      setDeletingReviewRow(null)
      setConfirmDeleteReviewRow(null)
    }
  }

  const submitReview = async () => {
    if (!reviewName.trim() || !reviewText.trim()) return
    setSubmittingReview(true)
    setReviewError('')
    setReviewSuccess('')
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reviewName, location: reviewLocation, rating: reviewRating, date: reviewDate,
          level: reviewLevel, text: reviewText, outcome: reviewOutcome, featured: reviewFeatured,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to publish review.')
      setReviewSuccess('Published — it will appear on the site immediately.')
      setReviewName('')
      setReviewLocation('')
      setReviewRating(5)
      setReviewDate(new Date().toISOString().slice(0, 10))
      setReviewLevel('')
      setReviewText('')
      setReviewOutcome('')
      setReviewFeatured(false)
    } catch (err: any) {
      setReviewError(err.message || 'Failed to publish review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const submitAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) return
    setSubmittingAnnouncement(true)
    setAnnouncementError('')
    setAnnouncementSuccess('')
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle, excerpt: announcementExcerpt, content: announcementContent,
          date: announcementDate, category: announcementCategory, important: announcementImportant,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to publish announcement.')
      setAnnouncementSuccess('Published — it will appear on the site immediately.')
      setAnnouncementTitle('')
      setAnnouncementExcerpt('')
      setAnnouncementContent('')
      setAnnouncementDate(new Date().toISOString().slice(0, 10))
      setAnnouncementCategory('Course Registration')
      setAnnouncementImportant(true)
    } catch (err: any) {
      setAnnouncementError(err.message || 'Failed to publish announcement.')
    } finally {
      setSubmittingAnnouncement(false)
    }
  }

  if (checkingSession) {
    return (
      <section className="section pt-20 text-center">
        <Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} />
      </section>
    )
  }

  if (!authenticated) {
    return (
      <section className="section pt-20">
        <div className="container max-w-sm mx-auto">
          <div className="card p-8 text-center">
            <Lock size={28} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h1 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Admin Login</h1>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Password"
              className="input w-full mb-3"
            />
            <button onClick={handleLogin} disabled={loggingIn || !password} className="btn-primary w-full justify-center disabled:opacity-50">
              {loggingIn ? 'Logging in...' : 'Log In'}
            </button>
            {loginError && (
              <p className="text-sm mt-3 flex items-center justify-center gap-1.5" style={{ color: '#DD0000' }}>
                <ShieldX size={14} /> {loginError}
              </p>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section pt-10">
      <div className="container max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Admin</h1>
          <button onClick={handleLogout} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <LogOut size={13} /> Log Out
          </button>
        </div>

        <div className="flex gap-1 flex-wrap border-b" style={{ borderColor: 'var(--border)' }}>
          {ADMIN_TABS.map(t => {
            const count = t.id === 'registrations' ? (pending?.length || 0)
              : t.id === 'a1' ? (applications?.filter(a => a.status === 'pending').length || 0)
              : t.id === 'crm' ? (crm?.filter(c => c.segment.indexOf('not registered') !== -1 || c.segment.indexOf('not selected') !== -1).length || 0)
              : t.id === 'content' ? (pendingReviews?.length || 0)
              : 0
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors inline-flex items-center gap-1.5"
                style={{
                  borderColor: activeTab === t.id ? '#DD0000' : 'transparent',
                  color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span className="text-xs font-semibold px-1.5 rounded-full" style={{ background: 'rgba(221,0,0,0.1)', color: '#DD0000' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {activeTab === 'overview' && (<>
        {/* Registration switch */}
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Power size={18} style={{ color: registrationOpen ? '#16a34a' : '#DD0000' }} />
              <div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registration</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {registrationOpen === null ? 'Loading...' : registrationOpen ? 'Currently open — students can register.' : 'Currently closed — new registrations are blocked.'}
                </div>
              </div>
            </div>
            <button
              onClick={toggleRegistration}
              disabled={registrationOpen === null || togglingRegistration}
              className={registrationOpen ? 'btn-secondary' : 'btn-primary'}
            >
              {registrationOpen === null ? '...' : togglingRegistration ? '...' : registrationOpen ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* A1 application switch */}
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Power size={18} style={{ color: a1ApplicationOpen ? '#16a34a' : '#DD0000' }} />
              <div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>A1 Applications</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {a1ApplicationOpen === null ? 'Loading...' : a1ApplicationOpen ? 'Currently open — anyone can apply.' : 'Currently closed — separate from the Registration switch above.'}
                </div>
              </div>
            </div>
            <button
              onClick={toggleA1Application}
              disabled={a1ApplicationOpen === null || togglingA1Application}
              className={a1ApplicationOpen ? 'btn-secondary' : 'btn-primary'}
            >
              {a1ApplicationOpen === null ? '...' : togglingA1Application ? '...' : a1ApplicationOpen ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* Block / unblock student */}
        <div className="card p-6">
          <div className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Block / Unblock Student</div>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={glabIdQuery}
              onChange={e => setGlabIdQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchStudent()}
              placeholder="GLAB ID"
              className="input flex-1"
            />
            <button onClick={searchStudent} disabled={searchingStudent || !glabIdQuery.trim()} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
              <Search size={14} /> Search
            </button>
          </div>
          {studentError && <p className="text-sm" style={{ color: '#DD0000' }}>{studentError}</p>}
          {studentResult && (
            <div className="flex items-center justify-between gap-4 flex-wrap px-4 py-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{studentResult.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {studentResult.glabId} · {studentResult.blocked ? 'Blocked' : 'Active'}
                  {studentResult.registration ? ` · ${studentResult.registration.course} (${studentResult.registration.status})` : ''}
                </div>
              </div>
              <button
                onClick={toggleBlock}
                disabled={togglingBlock}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: studentResult.blocked ? 'rgba(22,163,74,0.1)' : 'rgba(221,0,0,0.1)', color: studentResult.blocked ? '#16a34a' : '#DD0000' }}
              >
                {studentResult.blocked ? <><CheckCircle size={14} /> Unblock</> : <><Ban size={14} /> Block</>}
              </button>
            </div>
          )}
        </div>
        </>)}

        {activeTab === 'registrations' && (<>
        {/* Registrations by batch */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrations by Batch</div>
            <button onClick={loadAllRegistrations} disabled={loadingAllRegistrations} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingAllRegistrations ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {allRegistrationsError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{allRegistrationsError}</p>
          ) : allRegistrations === null || loadingAllRegistrations ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : (() => {
            const labels = ['A1 Morning', 'A1 Evening', 'A2 Morning', 'A2 Evening', 'B1 Morning', 'B1 Evening']
            const currentRegistrations = allRegistrations.filter(r => currentBatchIds.has(r.batchId))
            const counts: Record<string, number> = {}
            labels.forEach(l => { counts[l] = 0 })
            currentRegistrations.forEach(r => {
              const label = batchLabelFromId(r.batchId)
              if (label in counts) counts[label]++
            })
            const filtered = registrationBatchFilter === 'All'
              ? currentRegistrations
              : currentRegistrations.filter(r => batchLabelFromId(r.batchId) === registrationBatchFilter)
            return (
              <>
                <div className="flex gap-1.5 flex-wrap mb-4">
                  <button
                    onClick={() => setRegistrationBatchFilter('All')}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: registrationBatchFilter === 'All' ? '#DD0000' : 'var(--bg-secondary)',
                      color: registrationBatchFilter === 'All' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    All ({currentRegistrations.length})
                  </button>
                  {labels.map(label => (
                    <button
                      key={label}
                      onClick={() => setRegistrationBatchFilter(label)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: registrationBatchFilter === label ? '#DD0000' : 'var(--bg-secondary)',
                        color: registrationBatchFilter === label ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {label} ({counts[label]})
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No registrations for this filter.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-1.5">
                    {filtered.map((r, i) => (
                      <div key={r.glabId + i} className="flex items-center justify-between gap-4 flex-wrap px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{r.name} · {r.glabId}</span>
                        <span className="text-xs" style={{ color: r.status === 'Confirmed' ? '#16a34a' : 'var(--text-muted)' }}>
                          {r.course} — {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {/* Pending payment verification */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Payment Verification</div>
            <button onClick={loadPending} disabled={loadingPending} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingPending ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {pendingError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{pendingError}</p>
          ) : pending === null || loadingPending ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
          ) : (() => {
            const batchLabelOf = (reg: PendingRegistration) => {
              const label = batchLabelFromId(reg.batchId)
              return label === 'Other' ? (reg.batchId || 'Other') : label
            }
            const counts: Record<string, number> = {}
            pending.forEach(r => { const l = batchLabelOf(r); counts[l] = (counts[l] || 0) + 1 })
            const labels = Object.keys(counts).sort()
            const filtered = pendingBatchFilter === 'All' ? pending : pending.filter(r => batchLabelOf(r) === pendingBatchFilter)
            return (
              <>
                <div className="flex gap-1.5 flex-wrap mb-4">
                  <button
                    onClick={() => setPendingBatchFilter('All')}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: pendingBatchFilter === 'All' ? '#DD0000' : 'var(--bg-secondary)',
                      color: pendingBatchFilter === 'All' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    All ({pending.length})
                  </button>
                  {labels.map(label => (
                    <button
                      key={label}
                      onClick={() => setPendingBatchFilter(label)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: pendingBatchFilter === label ? '#DD0000' : 'var(--bg-secondary)',
                        color: pendingBatchFilter === label ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {label} ({counts[label]})
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending for this filter.</p>
                ) : (
            <div className="space-y-3">
              {filtered.map(reg => {
                const key = reg.glabId + reg.timestamp
                return (
                  <div key={key} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{reg.name} · {reg.glabId}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{reg.course} — {reg.batchId}</div>
                      </div>
                      <button
                        onClick={() => confirmRegistration(reg)}
                        disabled={confirmingKey === key}
                        className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                      >
                        {confirmingKey === key ? '...' : 'Confirm'}
                      </button>
                    </div>
                    <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{reg.paymentMethod}{reg.paymentReference ? ` · Ref: ${reg.paymentReference}` : ''}</span>
                      {reg.proofFileLink && (
                        <a href={reg.proofFileLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline" style={{ color: '#DD0000' }}>
                          View Proof <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
                )}
              </>
            )
          })()}
        </div>
        </>)}

        {activeTab === 'a1' && (<>
        {/* A1 applications */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>A1 Applications</div>
            <button onClick={loadApplications} disabled={loadingApplications} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingApplications ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg flex-wrap" style={{ background: 'var(--bg-secondary)' }}>
            <Settings size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>GLAB ID prefix:</span>
            <input
              type="text"
              value={idPrefixInput}
              onChange={e => setIdPrefixInput(e.target.value)}
              placeholder="e.g. 26H"
              className="input text-sm py-1.5 px-2 w-20"
            />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>next number:</span>
            <input
              type="number"
              min={1}
              value={idNextSeqInput}
              onChange={e => setIdNextSeqInput(e.target.value)}
              placeholder="e.g. 251"
              className="input text-sm py-1.5 px-2 w-24"
            />
            <button
              onClick={saveIdPrefix}
              disabled={
                savingIdPrefix || !idPrefixInput.trim() || !idNextSeqInput.trim() ||
                (idPrefixInput.trim().toUpperCase() === idPrefix && idNextSeqInput.trim() === idNextSeq)
              }
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
            >
              {savingIdPrefix ? '...' : 'Save'}
            </button>
            {idPrefix && idNextSeq && (
              <span className="text-xs w-full" style={{ color: 'var(--text-muted)' }}>
                Next ID will be GLAB{idPrefix}{idNextSeq.padStart(3, '0')} — the counter advances automatically after each Select.
              </span>
            )}
            {(!idPrefix || !idNextSeq) && <span className="text-xs w-full" style={{ color: '#DD0000' }}>Set both before selecting anyone</span>}
          </div>

          {applicationsError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{applicationsError}</p>
          ) : applications === null || loadingApplications ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : (
            <>
              {(() => {
                const pendingApps = applications.filter(a => a.status === 'pending')
                const batchCounts: Record<string, number> = {}
                pendingApps.forEach(a => {
                  const b = a.batchChoice || 'Unspecified'
                  batchCounts[b] = (batchCounts[b] || 0) + 1
                })
                const batchNames = Object.keys(batchCounts).sort()
                return batchNames.length > 0 ? (
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    <button
                      onClick={() => setApplicationBatchFilter('All')}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: applicationBatchFilter === 'All' ? '#DD0000' : 'var(--bg-secondary)',
                        color: applicationBatchFilter === 'All' ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      All ({pendingApps.length})
                    </button>
                    {batchNames.map(b => (
                      <button
                        key={b}
                        onClick={() => setApplicationBatchFilter(b)}
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: applicationBatchFilter === b ? '#DD0000' : 'var(--bg-secondary)',
                          color: applicationBatchFilter === b ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {b} ({batchCounts[b]})
                      </button>
                    ))}
                  </div>
                ) : null
              })()}

              {applications.filter(a => a.status === 'pending' && (applicationBatchFilter === 'All' || (a.batchChoice || 'Unspecified') === applicationBatchFilter)).length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
              ) : (
                <div className="space-y-3">
                  {applications.filter(a => a.status === 'pending' && (applicationBatchFilter === 'All' || (a.batchChoice || 'Unspecified') === applicationBatchFilter)).map(app => {
                    const key = applicationKey(app)
                    return (
                      <div key={key} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', borderLeft: app.flagged ? '3px solid #DD0000' : undefined }}>
                        <div className="mb-2">
                          <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                            {app.name}
                            {app.flagged && <Flag size={12} style={{ color: '#DD0000' }} fill="#DD0000" />}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {app.email} · {app.phone}{app.dob ? ` · DOB ${app.dob}` : ''}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Wants: {app.batchChoice || '—'}{app.occupation ? ` · ${app.occupation}` : ''}{app.city ? `, ${app.city}` : ''}
                          </div>
                          {app.note && (
                            <div className="text-xs mt-1 italic" style={{ color: '#DD0000' }}>Note: {app.note}</div>
                          )}
                        </div>
                        <details className="mb-2">
                          <summary className="text-xs underline cursor-pointer" style={{ color: 'var(--text-muted)' }}>Full application</summary>
                          <div className="text-xs mt-2 space-y-1" style={{ color: 'var(--text-primary)' }}>
                            {app.previousExperience === 'yes' && (
                              <p><strong>Previous GLAB course:</strong> {app.previousCourseDetails || '—'} ({app.previousCourseCompleted === 'yes' ? 'completed' : 'not completed'})</p>
                            )}
                            <p><strong>Motivation:</strong> {app.motivation || '—'}</p>
                            <p><strong>Why GLAB:</strong> {app.whyGlab || '—'}</p>
                            <p><strong>Primary goal:</strong> {app.primaryGoal || '—'} · <strong>Heard via:</strong> {app.howHeard || '—'}</p>
                            {app.facebookLink && <p><strong>Facebook:</strong> {app.facebookLink}</p>}
                            {app.comment && <p><strong>Comment:</strong> {app.comment}</p>}
                          </div>
                        </details>
                        <details className="mb-2">
                          <summary className="text-xs underline cursor-pointer" style={{ color: 'var(--text-muted)' }}>Admin note</summary>
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={noteDrafts[app.row] ?? app.note}
                              onChange={e => setNoteDrafts(prev => ({ ...prev, [app.row]: e.target.value }))}
                              placeholder="e.g. Recommended by GLAB26H130, or a concern to remember before deciding"
                              rows={2}
                              className="input text-sm"
                            />
                            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                              <input
                                type="checkbox"
                                checked={flaggedDrafts[app.row] ?? app.flagged}
                                onChange={e => setFlaggedDrafts(prev => ({ ...prev, [app.row]: e.target.checked }))}
                              />
                              Flag for attention
                            </label>
                            <button
                              onClick={() => saveApplicationNote(app)}
                              disabled={savingNoteRow === app.row}
                              className="btn-secondary text-xs px-3 py-1 disabled:opacity-50"
                            >
                              {savingNoteRow === app.row ? 'Saving...' : 'Save Note'}
                            </button>
                          </div>
                        </details>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={applicationBatch[key] || ''}
                            onChange={e => setApplicationBatch(prev => ({ ...prev, [key]: e.target.value }))}
                            className="input text-sm py-1.5 flex-1 min-w-[180px]"
                          >
                            <option value="" disabled>Select batch</option>
                            {a1Batches.map(b => (
                              <option key={b.id} value={b.id}>{b.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => selectApplicant(app)}
                            disabled={applicationActionKey === key || !applicationBatch[key] || !idPrefix || !idNextSeq}
                            className="btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <UserPlus size={13} /> {applicationActionKey === key ? '...' : 'Select'}
                          </button>
                          <button
                            onClick={() => rejectApplicant(app)}
                            disabled={applicationActionKey === key}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                            style={{ background: 'rgba(221,0,0,0.1)', color: '#DD0000' }}
                          >
                            <XCircle size={13} /> {applicationActionKey === key ? '...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => setShowDecidedApplications(v => !v)}
                className="text-xs underline mt-4"
                style={{ color: 'var(--text-muted)' }}
              >
                {showDecidedApplications ? 'Hide' : 'Show'} decided applications
              </button>
              {showDecidedApplications && (
                <div className="space-y-2 mt-3">
                  {applications.filter(a => a.status !== 'pending').length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>None yet.</p>
                  ) : applications.filter(a => a.status !== 'pending').map(app => (
                    <div key={applicationKey(app)} className="flex items-center justify-between gap-4 flex-wrap px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{app.name} · {app.email}</span>
                      <span style={{ color: app.status === 'selected' ? '#16a34a' : '#DD0000' }}>
                        {app.status === 'selected' ? `Selected — ${app.glabId || 'not yet registered'}${app.confirmedBatch ? ` — ${app.confirmedBatch}` : ''}` : 'Not Selected'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Duplicate / corrupt application cleanup */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Clean Up Applications</div>
            <button onClick={loadCleanupPreview} disabled={loadingCleanup} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingCleanup ? 'animate-spin' : ''} /> {loadingCleanup ? 'Scanning...' : 'Scan for Duplicates'}
            </button>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Finds rows with no name/email at all, and rows sharing the same email or WhatsApp number. Nothing is deleted until you review and confirm below.
          </p>
          {cleanupError && <p className="text-sm mb-2" style={{ color: '#DD0000' }}>{cleanupError}</p>}
          {cleanupSuccess && <p className="text-sm mb-2 flex items-center gap-1.5" style={{ color: '#16a34a' }}><CheckCircle size={14} /> {cleanupSuccess}</p>}

          {cleanup && (
            <>
              {cleanup.corruptRows.length === 0 && cleanup.duplicateGroups.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing found — the sheet looks clean.</p>
              ) : (
                <div className="space-y-4">
                  {cleanup.corruptRows.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Empty rows (no name or email)</div>
                      <div className="space-y-1">
                        {cleanup.corruptRows.map(r => (
                          <label key={r.row} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                            <input
                              type="checkbox"
                              checked={!!cleanupSelection[r.row]}
                              onChange={e => setCleanupSelection(prev => ({ ...prev, [r.row]: e.target.checked }))}
                            />
                            Row {r.row} — phone: {r.phone || '—'}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {cleanup.duplicateGroups.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Duplicate applicants</div>
                      <div className="space-y-2">
                        {cleanup.duplicateGroups.map(g => (
                          <div key={g.key} className="px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                            {g.rows.map(r => (
                              <label key={r.row} className="flex items-center gap-2 text-xs py-0.5">
                                <input
                                  type="checkbox"
                                  checked={!!cleanupSelection[r.row]}
                                  onChange={e => setCleanupSelection(prev => ({ ...prev, [r.row]: e.target.checked }))}
                                  disabled={r.row === g.keepRow}
                                />
                                <span style={{ color: r.row === g.keepRow ? '#16a34a' : 'var(--text-primary)' }}>
                                  Row {r.row} — {r.name || '(no name)'} · {r.email || '(no email)'} · {r.phone || '(no phone)'}
                                  {r.status ? ` · ${r.status}` : ''}
                                  {r.row === g.keepRow ? ' — keep' : ''}
                                </span>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={applyCleanup}
                    disabled={applyingCleanup || Object.values(cleanupSelection).every(v => !v)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: 'rgba(221,0,0,0.1)', color: '#DD0000' }}
                  >
                    <Trash2 size={14} /> {applyingCleanup ? 'Deleting...' : `Delete Selected (${Object.values(cleanupSelection).filter(Boolean).length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        </>)}

        {activeTab === 'crm' && (<>
        {/* Student database / CRM */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Student Database</div>
            <button onClick={loadCrm} disabled={loadingCrm} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingCrm ? 'animate-spin' : ''} /> {loadingCrm ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Every student and applicant in one place, tagged by where they are in the journey — so nobody who completed a level just disappears.
          </p>
          {crmError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{crmError}</p>
          ) : crm === null || loadingCrm ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : (() => {
            const counts: Record<string, number> = {}
            crm.forEach(c => { counts[c.segment] = (counts[c.segment] || 0) + 1 })
            const segments = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
            const search = crmSearch.trim().toLowerCase()
            const filtered = crm.filter(c => {
              if (crmSegmentFilter !== 'All' && c.segment !== crmSegmentFilter) return false
              if (search && !(c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search) || c.glabId.toLowerCase().includes(search) || c.phone.toLowerCase().includes(search))) return false
              return true
            })
            return (
              <>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <button
                    onClick={() => setCrmSegmentFilter('All')}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: crmSegmentFilter === 'All' ? '#DD0000' : 'var(--bg-secondary)',
                      color: crmSegmentFilter === 'All' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    All ({crm.length})
                  </button>
                  {segments.map(seg => (
                    <button
                      key={seg}
                      onClick={() => setCrmSegmentFilter(seg)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: crmSegmentFilter === seg ? '#DD0000' : 'var(--bg-secondary)',
                        color: crmSegmentFilter === seg ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {seg} ({counts[seg]})
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                  placeholder="Search name, email, phone, or GLAB ID..."
                  className="input text-sm mb-3"
                />

                {(() => {
                  const seen = new Set<string>()
                  const recipients = filtered
                    .filter(c => c.email && !seen.has(c.email.toLowerCase()) && seen.add(c.email.toLowerCase()))
                    .map(c => ({ name: c.name, email: c.email }))
                  return (
                    <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {crmSegmentFilter === 'All'
                            ? 'Pick a segment (or search) above to message a specific group'
                            : `Message this list — ${recipients.length} recipient${recipients.length === 1 ? '' : 's'} with an email`}
                        </span>
                      </div>
                      {crmSegmentFilter !== 'All' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={outreachSubject}
                            onChange={e => setOutreachSubject(e.target.value)}
                            placeholder="Subject"
                            className="input text-sm"
                          />
                          <textarea
                            value={outreachBody}
                            onChange={e => setOutreachBody(e.target.value)}
                            placeholder={'Message — use {{name}} to personalize, e.g. "Hi {{name}}, ..."'}
                            rows={4}
                            className="input text-sm"
                          />
                          <div className="rounded-lg p-3 flex items-center gap-2 flex-wrap" style={{ background: 'var(--bg-primary)', border: '1px dashed var(--border)' }}>
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Send a test first:</span>
                            <input
                              type="text"
                              value={testName}
                              onChange={e => setTestName(e.target.value)}
                              placeholder="Name"
                              className="input text-sm"
                              style={{ width: 110 }}
                            />
                            <input
                              type="email"
                              value={testEmail}
                              onChange={e => setTestEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="input text-sm"
                              style={{ width: 200 }}
                            />
                            <button
                              onClick={sendTestOutreach}
                              disabled={sendingTest || !testEmail.trim() || !outreachSubject.trim() || !outreachBody.trim()}
                              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
                            >
                              {sendingTest ? 'Sending...' : 'Send test'}
                            </button>
                            {testError && <p className="text-sm w-full" style={{ color: '#DD0000' }}>{testError}</p>}
                            {testResult && <p className="text-sm w-full flex items-center gap-1.5" style={{ color: '#16a34a' }}><CheckCircle size={14} /> {testResult}</p>}
                          </div>
                          {outreachError && <p className="text-sm" style={{ color: '#DD0000' }}>{outreachError}</p>}
                          {outreachResult && <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}><CheckCircle size={14} /> {outreachResult}</p>}
                          {!outreachConfirming ? (
                            <button
                              onClick={() => setOutreachConfirming(true)}
                              disabled={recipients.length === 0 || !outreachSubject.trim() || !outreachBody.trim()}
                              className="btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Mail size={13} /> Send to {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                Send this email to {recipients.length} {recipients.length === 1 ? 'person' : 'people'} now?
                              </span>
                              <button
                                onClick={() => sendOutreach(recipients)}
                                disabled={sendingOutreach}
                                className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                              >
                                {sendingOutreach ? 'Sending...' : 'Yes, send'}
                              </button>
                              <button
                                onClick={() => setOutreachConfirming(false)}
                                disabled={sendingOutreach}
                                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {filtered.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matches.</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-1.5">
                    {filtered.map((c, i) => (
                      <div key={(c.glabId || c.email) + i} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <span style={{ color: 'var(--text-primary)' }}>
                            {c.name || '(no name)'} {c.glabId ? `· ${c.glabId}` : ''}
                          </span>
                          <span className="text-xs" style={{ color: '#DD0000' }}>{c.segment}</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {c.email || '—'}{c.phone ? ` · ${c.phone}` : ''}
                          {c.lastCourse ? ` · ${c.lastCourse}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>
        </>)}

        {activeTab === 'batches' && (<>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Batches</div>
            <div className="flex items-center gap-3">
              <button onClick={loadBatches} disabled={loadingBatches} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={13} className={loadingBatches ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={startAddBatch} className="btn-primary text-sm px-3 py-1.5">Add New Batch</button>
            </div>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Every batch — current or upcoming — gets its own permanent row here. Never reuse an existing batch's row to prep the next one; add a new one instead.
          </p>

          {showAddBatch && (
            <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                {editingBatchId ? `Edit batch: ${editingBatchId}` : 'Add New Batch'}
              </div>
              {editingBatchId && (batches?.find(b => b.batchId === editingBatchId)?.confirmedCount ?? 0) > 0 && (
                <div className="rounded-lg p-3 mb-3 flex items-center gap-2" style={{ background: 'rgba(221,0,0,0.08)', border: '1px solid rgba(221,0,0,0.25)' }}>
                  <AlertTriangle size={16} style={{ color: '#DD0000', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {batches?.find(b => b.batchId === editingBatchId)?.confirmedCount} confirmed student{(batches?.find(b => b.batchId === editingBatchId)?.confirmedCount ?? 0) === 1 ? '' : 's'} currently see these links on MyGLAB — saving will change what they see immediately.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <input
                  type="text" value={batchForm.batchId}
                  onChange={e => setBatchForm(f => ({ ...f, batchId: e.target.value }))}
                  placeholder="Batch ID (e.g. b1-34-E)" className="input text-sm"
                  disabled={!!editingBatchId}
                />
                <input
                  type="url" value={batchForm.whatsappLink}
                  onChange={e => setBatchForm(f => ({ ...f, whatsappLink: e.target.value }))}
                  placeholder="WhatsApp Group Link" className="input text-sm"
                />
                <input
                  type="url" value={batchForm.classroomLink}
                  onChange={e => setBatchForm(f => ({ ...f, classroomLink: e.target.value }))}
                  placeholder="Google Classroom Link" className="input text-sm"
                />
                <input
                  type="url" value={batchForm.meetLink}
                  onChange={e => setBatchForm(f => ({ ...f, meetLink: e.target.value }))}
                  placeholder="Google Meet Link" className="input text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date" value={batchForm.startDate}
                    onChange={e => setBatchForm(f => ({ ...f, startDate: e.target.value }))}
                    className="input text-sm"
                  />
                  <input
                    type="date" value={batchForm.endDate}
                    onChange={e => setBatchForm(f => ({ ...f, endDate: e.target.value }))}
                    className="input text-sm"
                  />
                </div>
                {batchFormError && <p className="text-sm" style={{ color: '#DD0000' }}>{batchFormError}</p>}
                <div className="flex items-center gap-2">
                  <button onClick={saveBatch} disabled={savingBatch || !batchForm.batchId.trim()} className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50">
                    {savingBatch ? 'Saving...' : editingBatchId ? 'Save Changes' : 'Create Batch'}
                  </button>
                  <button onClick={() => setShowAddBatch(false)} disabled={savingBatch} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {batchesError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{batchesError}</p>
          ) : batches === null || loadingBatches ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : batches.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No batches yet.</p>
          ) : (
            <div className="space-y-2">
              {batches.map(b => (
                <div key={b.batchId} className="p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--bg-secondary)' }}>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {b.batchId} {b.confirmedCount > 0 && <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>— {b.confirmedCount} confirmed</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {[b.startDate, b.endDate].filter(Boolean).join(' → ') || 'No dates set'}
                      {' · '}
                      {[b.whatsappLink && 'WhatsApp', b.classroomLink && 'Classroom', b.meetLink && 'Meet'].filter(Boolean).join(', ') || 'No links set'}
                    </div>
                  </div>
                  <button onClick={() => startEditBatch(b)} className="btn-secondary text-sm px-3 py-1.5">Edit</button>
                </div>
              ))}
            </div>
          )}
        </div>
        </>)}

        {activeTab === 'finance' && (() => {
          const sessionCodes = (financeSessions || []).map(s => s.sessionCode)
          const filteredEntries = (finance || []).filter(e => financeSessionFilter === 'All' || e.session === financeSessionFilter)
          const filteredExpenses = (financeExpenses || []).filter(e => financeSessionFilter === 'All' || e.session === financeSessionFilter)
          const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
          const revenueBD = sum(filteredEntries.filter(e => e.location === 'BD').map(e => e.amountPaid))
          const revenueDE = sum(filteredEntries.filter(e => e.location === 'DE').map(e => e.amountPaid))
          const totalDiscount = sum(filteredEntries.map(e => e.discount))
          const totalDue = sum(filteredEntries.map(e => e.due))
          const expensesBD = sum(filteredExpenses.filter(e => e.location === 'BD').map(e => e.amount))
          const expensesDE = sum(filteredExpenses.filter(e => e.location === 'DE').map(e => e.amount))
          const allTimeBD = (openingBD || 0) + sum((finance || []).filter(e => e.location === 'BD').map(e => e.amountPaid))
          const allTimeDE = (openingDE || 0) + sum((finance || []).filter(e => e.location === 'DE').map(e => e.amountPaid))
          const fmt = (n: number) => n.toLocaleString()
          const entryCounts: Record<string, number> = {}
          ;(finance || []).forEach(e => { if (e.session) entryCounts[e.session] = (entryCounts[e.session] || 0) + 1 })

          return (<>
          {/* Session tabs — filters everything below (Summary, Entries, Expenses) */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFinanceSessionFilter('All')}
              className="text-sm px-3 py-1.5 rounded-full font-medium"
              style={{
                background: financeSessionFilter === 'All' ? '#DD0000' : 'var(--bg-secondary)',
                color: financeSessionFilter === 'All' ? '#fff' : 'var(--text-muted)',
              }}
            >
              All ({(finance || []).length})
            </button>
            {sessionCodes.map(code => (
              <button
                key={code}
                onClick={() => setFinanceSessionFilter(code)}
                className="text-sm px-3 py-1.5 rounded-full font-medium"
                style={{
                  background: financeSessionFilter === code ? '#DD0000' : 'var(--bg-secondary)',
                  color: financeSessionFilter === code ? '#fff' : 'var(--text-muted)',
                }}
              >
                {code} ({entryCounts[code] || 0})
              </button>
            ))}
          </div>

          {/* Opening balance */}
          <div className="card p-6">
            <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Opening Balance</div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              A one-time starting figure representing real total revenue up to the day this system went live. Set once — everything recorded from here on is added on top of it automatically.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="number" value={openingForm.openingBD} onChange={e => setOpeningForm(f => ({ ...f, openingBD: e.target.value }))} placeholder="Opening Revenue (BD)" className="input text-sm" style={{ width: 200 }} />
              <input type="number" value={openingForm.openingDE} onChange={e => setOpeningForm(f => ({ ...f, openingDE: e.target.value }))} placeholder="Opening Revenue (DE)" className="input text-sm" style={{ width: 200 }} />
              <button onClick={saveOpeningBalance} disabled={savingOpening} className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50">{savingOpening ? 'Saving...' : 'Save'}</button>
            </div>
          </div>

          {/* Sessions */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Sessions</div>
              <button onClick={startAddSession} className="btn-primary text-sm px-3 py-1.5">Add New Session</button>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Define each session's date range once — every Finance/Expense entry is auto-tagged by matching its date into these ranges.</p>
            {showAddSession && (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="space-y-3">
                  <input type="text" value={sessionForm.sessionCode} onChange={e => setSessionForm(f => ({ ...f, sessionCode: e.target.value }))} placeholder="Session Code (e.g. 26H)" className="input text-sm" disabled={!!editingSessionCode} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={sessionForm.startDate} onChange={e => setSessionForm(f => ({ ...f, startDate: e.target.value }))} className="input text-sm" />
                    <input type="date" value={sessionForm.endDate} onChange={e => setSessionForm(f => ({ ...f, endDate: e.target.value }))} className="input text-sm" />
                  </div>
                  {sessionFormError && <p className="text-sm" style={{ color: '#DD0000' }}>{sessionFormError}</p>}
                  <div className="flex items-center gap-2">
                    <button onClick={saveSession} disabled={savingSession} className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50">{savingSession ? 'Saving...' : editingSessionCode ? 'Save Changes' : 'Create Session'}</button>
                    <button onClick={() => setShowAddSession(false)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {(financeSessions || []).map(s => (
                <div key={s.sessionCode} className="p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <strong>{s.sessionCode}</strong> — {s.startDate} → {s.endDate}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {confirmDeleteSessionCode === s.sessionCode ? (
                      <>
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Delete this session?</span>
                        <button onClick={() => deleteSession(s.sessionCode)} disabled={deletingSessionCode === s.sessionCode} className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#DD0000', color: '#fff' }}>
                          {deletingSessionCode === s.sessionCode ? '...' : 'Yes, delete'}
                        </button>
                        <button onClick={() => setConfirmDeleteSessionCode(null)} disabled={deletingSessionCode === s.sessionCode} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setConfirmDeleteSessionCode(s.sessionCode)} className="btn-secondary text-sm px-3 py-1.5">Delete</button>
                        <button onClick={() => startEditSession(s)} className="btn-secondary text-sm px-3 py-1.5">Edit</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {financeSessions && financeSessions.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sessions defined yet.</p>}
            </div>
          </div>

          {/* Summary */}
          <div className="card p-6">
            <div className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Summary {financeSessionFilter !== 'All' && `— ${financeSessionFilter}`}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><div style={{ color: 'var(--text-muted)' }}>Revenue (BD)</div><div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(revenueBD)}</div></div>
              <div><div style={{ color: 'var(--text-muted)' }}>Revenue (DE)</div><div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(revenueDE)}</div></div>
              <div><div style={{ color: 'var(--text-muted)' }}>Discount Given</div><div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(totalDiscount)}</div></div>
              <div><div style={{ color: 'var(--text-muted)' }}>Due Outstanding</div><div className="font-semibold" style={{ color: '#DD0000' }}>{fmt(totalDue)}</div></div>
              <div><div style={{ color: 'var(--text-muted)' }}>Expenses (BD)</div><div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(expensesBD)}</div></div>
              <div><div style={{ color: 'var(--text-muted)' }}>Expenses (DE)</div><div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(expensesDE)}</div></div>
              <div><div style={{ color: 'var(--text-muted)' }}>All-Time Revenue (BD)</div><div className="font-semibold" style={{ color: '#16a34a' }}>{fmt(allTimeBD)}</div></div>
              <div><div style={{ color: 'var(--text-muted)' }}>All-Time Revenue (DE)</div><div className="font-semibold" style={{ color: '#16a34a' }}>{fmt(allTimeDE)}</div></div>
            </div>
          </div>

          {/* Finance entries */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Finance Entries</div>
              <button onClick={loadFinance} disabled={loadingFinance} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={13} className={loadingFinance ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>New rows appear automatically when a registration is confirmed. Fill in Course Fee, Amount Paid, Discount, Location, and Payment Account as you reconcile each one.</p>
            {financeError ? (
              <p className="text-sm" style={{ color: '#DD0000' }}>{financeError}</p>
            ) : finance === null || loadingFinance ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
            ) : filteredEntries.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No entries yet.</p>
            ) : (
              <div className="space-y-2">
                {filteredEntries.map(e => (
                  <div key={e.row} className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        <strong>{e.glabId}</strong> — {e.name} · {e.course} · {e.date} {e.session && `· ${e.session}`}
                      </div>
                      {editingFinanceRow !== e.row && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {confirmDeleteFinanceRow === e.row ? (
                            <>
                              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Delete this entry?</span>
                              <button onClick={() => deleteFinanceEntry(e.row)} disabled={deletingFinanceRow === e.row} className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#DD0000', color: '#fff' }}>
                                {deletingFinanceRow === e.row ? '...' : 'Yes, delete'}
                              </button>
                              <button onClick={() => setConfirmDeleteFinanceRow(null)} disabled={deletingFinanceRow === e.row} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setConfirmDeleteFinanceRow(e.row)} className="btn-secondary text-sm px-3 py-1.5">Delete</button>
                              <button onClick={() => startEditFinanceEntry(e)} className="btn-secondary text-sm px-3 py-1.5">Edit</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {editingFinanceRow === e.row ? (
                      <div className="space-y-2 mt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <input type="number" value={financeEntryForm.courseFee} onChange={ev => setFinanceEntryForm(f => ({ ...f, courseFee: ev.target.value }))} placeholder="Course Fee" className="input text-sm" />
                          <input type="number" value={financeEntryForm.amountPaid} onChange={ev => setFinanceEntryForm(f => ({ ...f, amountPaid: ev.target.value }))} placeholder="Amount Paid" className="input text-sm" />
                          <input type="number" value={financeEntryForm.discount} onChange={ev => setFinanceEntryForm(f => ({ ...f, discount: ev.target.value }))} placeholder="Discount" className="input text-sm" />
                          <select value={financeEntryForm.location} onChange={ev => setFinanceEntryForm(f => ({ ...f, location: ev.target.value }))} className="input text-sm">
                            <option value="">Location</option>
                            <option value="BD">BD</option>
                            <option value="DE">DE</option>
                          </select>
                          <input type="text" value={financeEntryForm.paymentAccount} onChange={ev => setFinanceEntryForm(f => ({ ...f, paymentAccount: ev.target.value }))} placeholder="Payment Account (e.g. bKash-660)" className="input text-sm" />
                          <input type="text" value={financeEntryForm.paymentReference} onChange={ev => setFinanceEntryForm(f => ({ ...f, paymentReference: ev.target.value }))} placeholder="Payment Reference" className="input text-sm" />
                        </div>
                        <input type="text" value={financeEntryForm.notes} onChange={ev => setFinanceEntryForm(f => ({ ...f, notes: ev.target.value }))} placeholder="Notes (optional)" className="input text-sm" />
                        <div className="flex items-center gap-2">
                          <button onClick={saveFinanceEntry} disabled={savingFinanceEntry} className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50">{savingFinanceEntry ? 'Saving...' : 'Save'}</button>
                          <button onClick={() => setEditingFinanceRow(null)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Fee: {fmt(e.courseFee)} · Paid: {fmt(e.amountPaid)} · Discount: {fmt(e.discount)} · Due: <span style={{ color: e.due > 0 ? '#DD0000' : 'inherit' }}>{fmt(e.due)}</span> · {e.location || 'No location'} · {e.paymentAccount || 'No account set'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses */}
          <div className="card p-6">
            <div className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Expenses</div>
            <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} className="input text-sm" />
                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="input text-sm" />
                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount" className="input text-sm" />
                <select value={expenseForm.location} onChange={e => setExpenseForm(f => ({ ...f, location: e.target.value }))} className="input text-sm">
                  <option value="">Location</option>
                  <option value="BD">BD</option>
                  <option value="DE">DE</option>
                </select>
                <input type="text" value={expenseForm.paidFrom} onChange={e => setExpenseForm(f => ({ ...f, paidFrom: e.target.value }))} placeholder="Paid From (e.g. Cash)" className="input text-sm" />
              </div>
              {expenseError && <p className="text-sm mb-2" style={{ color: '#DD0000' }}>{expenseError}</p>}
              <button onClick={addExpense} disabled={savingExpense} className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50">{savingExpense ? 'Adding...' : 'Add Expense'}</button>
            </div>
            <div className="space-y-2">
              {filteredExpenses.map(e => (
                <div key={e.row} className="p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{e.date} — {e.description}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{fmt(e.amount)} · {e.location || '—'} · {e.paidFrom || '—'}</div>
                    {confirmDeleteExpenseRow === e.row ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Delete?</span>
                        <button onClick={() => deleteExpense(e.row)} disabled={deletingExpenseRow === e.row} className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#DD0000', color: '#fff' }}>
                          {deletingExpenseRow === e.row ? '...' : 'Yes'}
                        </button>
                        <button onClick={() => setConfirmDeleteExpenseRow(null)} disabled={deletingExpenseRow === e.row} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteExpenseRow(e.row)} className="btn-secondary text-sm px-3 py-1.5">Delete</button>
                    )}
                  </div>
                </div>
              ))}
              {financeExpenses && filteredExpenses.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No expenses recorded yet.</p>}
            </div>
          </div>
          </>)
        })()}

        {activeTab === 'content' && (<>
        {/* Pending reviews (student self-submitted) */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Reviews</div>
            <button onClick={loadPendingReviews} disabled={loadingPendingReviews} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingPendingReviews ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {pendingReviewsError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{pendingReviewsError}</p>
          ) : pendingReviews === null || loadingPendingReviews ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : pendingReviews.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
          ) : (
            <div className="space-y-3">
              {pendingReviews.map(rev => (
                <div key={rev.row} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {rev.name} {rev.location ? `· ${rev.location}` : ''} {rev.course ? `· ${rev.course}` : ''}
                      </div>
                      <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        {rev.rating ? Array.from({ length: rev.rating }).map((_, i) => <Star key={i} size={11} fill="#FFCE00" style={{ color: '#FFCE00' }} />) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {confirmDeleteReviewRow === rev.row ? (
                        <>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Delete this review?</span>
                          <button
                            onClick={() => deletePendingReview(rev.row)}
                            disabled={deletingReviewRow === rev.row}
                            className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
                            style={{ background: '#DD0000', color: '#fff' }}
                          >
                            {deletingReviewRow === rev.row ? '...' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteReviewRow(null)}
                            disabled={deletingReviewRow === rev.row}
                            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setConfirmDeleteReviewRow(rev.row)}
                            className="btn-secondary text-sm px-3 py-1.5"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => approvePendingReview(rev.row)}
                            disabled={approvingReviewRow === rev.row}
                            className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                          >
                            {approvingReviewRow === rev.row ? '...' : 'Publish'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{rev.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add review */}
        <div className="card p-6">
          <div className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Star size={16} /> Add Review
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Name" className="input" />
              <input type="text" value={reviewLocation} onChange={e => setReviewLocation(e.target.value)} placeholder="Location (optional)" className="input" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="input">
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
              </select>
              <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className="input" />
              <select value={reviewLevel} onChange={e => setReviewLevel(e.target.value)} className="input">
                <option value="" disabled>Select category</option>
                {REVIEW_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Review text" rows={4} className="input" />
            <input type="text" value={reviewOutcome} onChange={e => setReviewOutcome(e.target.value)} placeholder="Outcome badge, e.g. Passed Goethe B1 Exam (optional)" className="input" />
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={reviewFeatured} onChange={e => setReviewFeatured(e.target.checked)} />
              Feature this review (shows in the homepage spotlight)
            </label>
            {reviewError && <p className="text-sm" style={{ color: '#DD0000' }}>{reviewError}</p>}
            {reviewSuccess && <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}><CheckCircle size={14} /> {reviewSuccess}</p>}
            <button
              onClick={submitReview}
              disabled={submittingReview || !reviewName.trim() || !reviewText.trim()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle size={14} /> {submittingReview ? 'Publishing...' : 'Publish Review'}
            </button>
          </div>
        </div>

        {/* Add announcement */}
        <div className="card p-6">
          <div className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Megaphone size={16} /> Add Announcement
          </div>
          <div className="space-y-3">
            <input type="text" value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} placeholder="Title" className="input" />
            <input type="text" value={announcementExcerpt} onChange={e => setAnnouncementExcerpt(e.target.value)} placeholder="Excerpt (short summary shown in the list)" className="input" />
            <textarea value={announcementContent} onChange={e => setAnnouncementContent(e.target.value)} placeholder="Full announcement text" rows={6} className="input" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="date" value={announcementDate} onChange={e => setAnnouncementDate(e.target.value)} className="input" />
              <select value={announcementCategory} onChange={e => setAnnouncementCategory(e.target.value)} className="input">
                {ANNOUNCEMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={announcementImportant} onChange={e => setAnnouncementImportant(e.target.checked)} />
              Mark as important (highlighted badge)
            </label>
            {announcementError && <p className="text-sm" style={{ color: '#DD0000' }}>{announcementError}</p>}
            {announcementSuccess && <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}><CheckCircle size={14} /> {announcementSuccess}</p>}
            <button
              onClick={submitAnnouncement}
              disabled={submittingAnnouncement || !announcementTitle.trim() || !announcementContent.trim()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle size={14} /> {submittingAnnouncement ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </div>
        </>)}
      </div>
    </section>
  )
}

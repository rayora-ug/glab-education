'use client'

import { useEffect, useState } from 'react'
import {
  Lock, ShieldX, Search, Ban, CheckCircle, Power,
  ExternalLink, RefreshCw, LogOut, Loader2, Star, PlusCircle,
  UserPlus, XCircle, Settings, Megaphone, Flag, Trash2,
} from 'lucide-react'
import { REVIEW_LEVELS } from '../portal/shared'
import coursesData from '../../data/courses.json'

const a1Batches = (coursesData as any[])
  .filter(c => c.level === 'A1' && c.registrationOpen)
  .flatMap((c: any) => (c.batches || []).map((b: any) => ({
    id: b.id, label: `${c.title} — ${b.label}`,
  })))

const ANNOUNCEMENT_CATEGORIES = ['Course Registration', 'Events', 'Workshops', 'Exam Preparation', 'General Updates']

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'registrations', label: 'Registrations' },
  { id: 'a1', label: 'A1 Pipeline' },
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

type InterestRequest = {
  timestamp: string
  glabId: string
  name: string
  level: string
  requestedBatch: string
  currentBatch: string
  email: string
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

  const [glabIdQuery, setGlabIdQuery] = useState('')
  const [studentResult, setStudentResult] = useState<Student | null>(null)
  const [studentError, setStudentError] = useState('')
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [togglingBlock, setTogglingBlock] = useState(false)

  const [pending, setPending] = useState<PendingRegistration[] | null>(null)
  const [pendingError, setPendingError] = useState('')
  const [loadingPending, setLoadingPending] = useState(false)
  const [confirmingKey, setConfirmingKey] = useState('')

  const [allRegistrations, setAllRegistrations] = useState<AllRegistration[] | null>(null)
  const [allRegistrationsError, setAllRegistrationsError] = useState('')
  const [loadingAllRegistrations, setLoadingAllRegistrations] = useState(false)
  const [registrationBatchFilter, setRegistrationBatchFilter] = useState('All')

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

  const [interest, setInterest] = useState<InterestRequest[] | null>(null)
  const [interestError, setInterestError] = useState('')
  const [loadingInterest, setLoadingInterest] = useState(false)
  const [approvingKey, setApprovingKey] = useState('')

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
    loadPending()
    loadAllRegistrations()
    loadInterest()
    loadPendingReviews()
    loadApplications()
    loadIdPrefix()
  }, [authenticated])

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
    setInterest(null)
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

  const loadInterest = async () => {
    setLoadingInterest(true)
    setInterestError('')
    try {
      const res = await fetch('/api/admin/interest/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setInterest(data.requests)
      else setInterestError(data.error || 'Failed to load interest requests.')
    } catch {
      setInterestError('Failed to load interest requests.')
    } finally {
      setLoadingInterest(false)
    }
  }

  const approveInterest = async (req: InterestRequest) => {
    const key = req.glabId + req.timestamp
    setApprovingKey(key)
    try {
      const res = await fetch('/api/admin/interest/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: req.glabId, timestamp: req.timestamp, level: req.level }),
      })
      const data = await res.json()
      if (data.success) {
        setInterest(prev => (prev || []).filter(r => r.glabId + r.timestamp !== key))
      }
    } finally {
      setApprovingKey('')
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
            const count = t.id === 'registrations' ? (pending?.length || 0) + (interest?.length || 0)
              : t.id === 'a1' ? (applications?.filter(a => a.status === 'pending').length || 0)
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
            const counts: Record<string, number> = {}
            labels.forEach(l => { counts[l] = 0 })
            allRegistrations.forEach(r => {
              const label = batchLabelFromId(r.batchId)
              if (label in counts) counts[label]++
            })
            const filtered = registrationBatchFilter === 'All'
              ? allRegistrations
              : allRegistrations.filter(r => batchLabelFromId(r.batchId) === registrationBatchFilter)
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
                    All ({allRegistrations.length})
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
          ) : (
            <div className="space-y-3">
              {pending.map(reg => {
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
                        {app.status === 'selected' ? `Selected — ${app.glabId}${app.confirmedBatch ? ` — ${app.confirmedBatch}` : ''}` : 'Not Selected'}
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

        {activeTab === 'registrations' && (<>
        {/* Next level interest */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Next Level Interest</div>
            <button onClick={loadInterest} disabled={loadingInterest} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingInterest ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {interestError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{interestError}</p>
          ) : interest === null || loadingInterest ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : interest.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
          ) : (
            <div className="space-y-3">
              {interest.map(req => {
                const key = req.glabId + req.timestamp
                return (
                  <div key={key} className="flex items-center justify-between gap-4 flex-wrap p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{req.name} · {req.glabId}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Interested in {req.level}{req.requestedBatch ? ` — wants ${req.requestedBatch}` : ''}
                      </div>
                      {req.currentBatch && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Currently in: {req.currentBatch}</div>
                      )}
                      {req.email && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{req.email}</div>
                      )}
                    </div>
                    <button
                      onClick={() => approveInterest(req)}
                      disabled={approvingKey === key}
                      className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      {approvingKey === key ? '...' : `Approve for ${req.level}`}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </>)}

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
                    <button
                      onClick={() => approvePendingReview(rev.row)}
                      disabled={approvingReviewRow === rev.row}
                      className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      {approvingReviewRow === rev.row ? '...' : 'Publish'}
                    </button>
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

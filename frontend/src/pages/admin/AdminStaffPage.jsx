import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client'

const PERMISSIONS = [
  ['dashboard', 'Dashboard'],
  ['pos', 'POS / Billing'],
  ['hold-bills', 'Hold Bills'],
  ['stock', 'Stock'],
  ['orders', 'Live Orders'],
  ['kot', 'KOT Kitchen'],
  ['operations', 'Operations'],
  ['products', 'Products'],
  ['customers', 'Customers'],
  ['royalty', 'Royalty Ledger'],
  ['rewards', 'Rewards'],
  ['reports', 'Reports'],
  ['settings', 'Settings'],
]

const ROLES = ['ADMIN', 'BILLING_STAFF', 'KITCHEN_STAFF']

export default function AdminStaffPage() {
  const [data, setData] = useState({ staff: [], attendance: [], today: '' })
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'BILLING_STAFF',
    permissions: ['dashboard', 'pos', 'orders'],
  })
  const [editingId, setEditingId] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await apiRequest('/admin/staff', { isAdmin: true })
      setData(res)
    } catch (err) {
      alert(`Staff load failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((item) => item !== key)
        : [...prev.permissions, key],
    }))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({ name: '', email: '', phone: '', password: '', role: 'BILLING_STAFF', permissions: ['dashboard', 'pos', 'orders'] })
  }

  const editStaff = (staff) => {
    setEditingId(staff.id)
    setForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      password: '',
      role: staff.role,
      permissions: staff.permissions?.includes('*') ? PERMISSIONS.map(([key]) => key) : staff.permissions || ['dashboard'],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveStaff = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, permissions: form.role === 'SUPER_ADMIN' ? ['*'] : form.permissions }
      if (editingId) {
        await apiRequest(`/admin/staff/${editingId}`, { method: 'PATCH', isAdmin: true, body: payload })
      } else {
        await apiRequest('/admin/staff', { method: 'POST', isAdmin: true, body: payload })
      }
      resetForm()
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  const deactivateStaff = async (staff) => {
    if (!window.confirm(`Deactivate ${staff.name}? They cannot login after this.`)) return
    try {
      await apiRequest(`/admin/staff/${staff.id}`, { method: 'DELETE', isAdmin: true })
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  const markAttendance = async (staff, action) => {
    try {
      await apiRequest(`/admin/staff/${staff.id}/attendance`, {
        method: 'POST',
        isAdmin: true,
        body: { action, date: data.today, status: 'PRESENT' },
      })
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading staff management...</div>

  const attendanceByStaff = {}
  for (const row of data.attendance || []) {
    if (row.date === data.today) attendanceByStaff[row.staff_id] = row
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cocoa-dark)', margin: 0 }}>
          Staff Login & Access Management
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          Create staff login credentials, control page access, and manage daily attendance.
        </p>
      </div>

      <section style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '18px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>{editingId ? 'Edit Staff Access' : 'Create Staff Login'}</h3>
        <form onSubmit={saveStaff} style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <input className="form-input" placeholder="Staff name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="form-input" type="email" placeholder="Login email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <input className="form-input" placeholder="Phone optional" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <input className="form-input" type="password" placeholder={editingId ? 'New password optional' : 'Login password'} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required={!editingId} />
            <select className="form-input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              {ROLES.map((role) => <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--cocoa-dark)', marginBottom: '8px' }}>Allowed Access</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PERMISSIONS.map(([key, label]) => {
                const active = form.permissions.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePermission(key)}
                    className={`btn btn--sm ${active ? 'btn--gold' : 'btn--outline'}`}
                    style={{ padding: '7px 11px', fontSize: '11px' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {editingId && <button type="button" className="btn btn--outline btn--sm" onClick={resetForm}>Cancel Edit</button>}
            <button type="submit" className="btn btn--gold btn--sm">{editingId ? 'Update Staff' : 'Create Staff Login'}</button>
          </div>
        </form>
      </section>

      <section style={{ background: '#FFFFFF', border: '1px solid rgba(61,37,30,0.1)', borderRadius: '16px', padding: '18px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--cocoa-dark)' }}>Staff List & Today Attendance</h3>
        <div className="table-responsive admin-scroll-panel admin-scroll-panel--md">
          <table className="admin-table" style={{ margin: 0, minWidth: '900px' }}>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Access</th>
                <th>Attendance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((staff) => {
                const attendance = attendanceByStaff[staff.id]
                return (
                  <tr key={staff.id} style={{ opacity: staff.isActive ? 1 : 0.55 }}>
                    <td>
                      <strong>{staff.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{staff.email} {staff.phone ? `| ${staff.phone}` : ''}</div>
                    </td>
                    <td>{staff.role.replace(/_/g, ' ')}</td>
                    <td style={{ maxWidth: '260px', whiteSpace: 'normal', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {staff.permissions?.includes('*') ? 'All access' : (staff.permissions || []).join(', ')}
                    </td>
                    <td>
                      {attendance ? (
                        <span style={{ color: '#2E6F40', fontWeight: 800 }}>
                          In {attendance.check_in ? new Date(attendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          {attendance.check_out ? ` / Out ${new Date(attendance.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Not marked</span>
                      )}
                    </td>
                    <td>{staff.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => editStaff(staff)}>Edit</button>
                        <button type="button" className="btn btn--gold btn--sm" onClick={() => markAttendance(staff, 'CHECK_IN')}>Check In</button>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => markAttendance(staff, 'CHECK_OUT')}>Check Out</button>
                        <button type="button" className="btn btn--sm" style={{ background: 'rgba(186,27,27,0.1)', color: '#BA1B1B' }} onClick={() => deactivateStaff(staff)}>Deactivate</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

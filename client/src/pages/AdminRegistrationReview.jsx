import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const STATUS_TABS = [
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

export default function AdminRegistrationReview() {
  const [list, setList] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const nav = useNavigate()

  const load = (status) => {
    setLoading(true)
    api.getRegistrationApplications(status).then(data => {
      setList(data || [])
      setLoading(false)
    }).catch(() => { setList([]); setLoading(false) })
  }

  useEffect(() => { load(tab) }, [tab])

  const handleApprove = async (id) => {
    try {
      await api.reviewRegistration(id, { approved: true })
      load(tab)
    } catch (e) { alert(e.message) }
  }

  const handleReject = async (id) => {
    if (!reason.trim()) { alert('请输入拒绝理由'); return }
    try {
      await api.reviewRegistration(id, { approved: false, reject_reason: reason })
      setRejecting(null); setReason('')
      load(tab)
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-20">
      <div className="flex items-center mb-4">
        <button onClick={() => nav('/admin')} className="text-white/60 mr-3">←</button>
        <h1 className="text-xl font-bold">注册审核</h1>
      </div>

      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-white/40 py-8">加载中...</div>
      ) : list.length === 0 ? (
        <p className="text-center text-white/30 py-8">暂无申请</p>
      ) : (
        <div className="space-y-3">
          {list.map(app => (
            <div key={app.id} className="bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{app.username || app.user?.username || '未知'}</span>
                <span className="text-xs text-white/40">{app.status}</span>
              </div>
              {app.reason && <p className="text-sm text-white/60 mb-2">申请理由：{app.reason}</p>}
              {app.created_at && <p className="text-xs text-white/40 mb-2">{new Date(app.created_at).toLocaleString()}</p>}
              {app.status === 'pending' && (
                rejecting === app.id ? (
                  <div className="space-y-2 mt-2">
                    <input className="input-field" placeholder="拒绝理由" value={reason}
                      onChange={e => setReason(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => handleReject(app.id)} className="btn-primary flex-1">确认拒绝</button>
                      <button onClick={() => { setRejecting(null); setReason('') }} className="btn-ghost">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(app.id)} className="btn-primary flex-1">通过</button>
                    <button onClick={() => setRejecting(app.id)} className="btn-ghost">拒绝</button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

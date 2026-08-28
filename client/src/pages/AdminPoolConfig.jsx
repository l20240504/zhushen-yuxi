import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function AdminPoolConfig() {
  const [talentPool, setTalentPool] = useState([])
  const [itemPool, setItemPool] = useState([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([
      api.getLotteryPool('talent').catch(() => []),
      api.getLotteryPool('item').catch(() => [])
    ]).then(([t, i]) => {
      setTalentPool(t || [])
      setItemPool(i || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white/40">加载中...</div>

  return (
    <div className="min-h-screen px-4 py-6 pb-20">
      <div className="flex items-center mb-4">
        <button onClick={() => nav('/admin')} className="text-white/60 mr-3">←</button>
        <h1 className="text-xl font-bold">奖池配置</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-sm text-white/60 mb-3">天赋奖池（{talentPool.length}）</h2>
        {talentPool.length === 0 ? (
          <p className="text-center text-white/30 py-4">奖池为空</p>
        ) : (
          <div className="space-y-2">
            {talentPool.map((t, idx) => (
              <div key={t.id || idx} className="bg-card p-3 flex items-center justify-between">
                <div>
                  <span className={`grade-${t.grade || 'D'} font-medium`}>{t.name || t.talent_name}</span>
                  {t.description && <p className="text-xs text-white/40 mt-1">{t.description}</p>}
                </div>
                <span className="text-xs text-accent-gold">权重 {t.weight ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm text-white/60 mb-3">道具奖池（{itemPool.length}）</h2>
        {itemPool.length === 0 ? (
          <p className="text-center text-white/30 py-4">奖池为空</p>
        ) : (
          <div className="space-y-2">
            {itemPool.map((item, idx) => (
              <div key={item.id || idx} className="bg-card p-3 flex items-center justify-between">
                <div>
                  <span className={`grade-${item.grade || 'D'} font-medium`}>{item.name || item.item_name}</span>
                  {item.description && <p className="text-xs text-white/40 mt-1">{item.description}</p>}
                </div>
                <span className="text-xs text-accent-gold">权重 {item.weight ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Market() {
  const [listings, setListings] = useState([])
  const [character, setCharacter] = useState(null)
  const [items, setItems] = useState([])
  const [allItems, setAllItems] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [bids, setBids] = useState(null)
  const nav = useNavigate()

  const load = () => {
    api.getMarketListings().then(setListings).catch(() => {})
    api.getMyCharacter().then(c => {
      if (c) { setCharacter(c); api.getCharacterItems(c.id).then(setItems) }
    }).catch(() => {})
    api.getItems().then(setAllItems).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleBuy = async (id) => {
    if (!confirm('确认购买？')) return
    try { await api.buyMarketListing(id); load() } catch (e) { alert(e.message) }
  }
  const handleCancel = async (id) => {
    try { await api.cancelMarketListing(id); load() } catch (e) { alert(e.message) }
  }
  const handleShowBids = async (id) => {
    const b = await api.getBids(id)
    setBids({ id, bids: b })
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold gradient-text">交易市场</h1>
        <button onClick={() => setShowCreate(true)} className="btn-ghost text-sm">挂单</button>
      </div>

      {listings.length === 0 ? (
        <p className="text-center text-white/30 py-8">暂无挂单</p>
      ) : (
        <div className="space-y-3">
          {listings.map(l => {
            const isMine = character && l.seller_id === character.id
            return (
              <div key={l.id} className="bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`grade-${l.item?.grade || 'D'} font-medium`}>{l.item?.name}</span>
                  <span className="text-xs text-white/40">
                    {l.trade_type === 'auction' ? '拍卖' : l.trade_type === 'private' ? '私有' : '公开'}
                  </span>
                </div>
                <div className="text-xs text-white/50 mb-2">
                  卖家：{l.is_anonymous ? '匿名' : l.seller?.profile?.username || '未知'}
                  {l.wanted_item && ` | 求换：${l.wanted_item?.name}`}
                  {l.current_price && ` | 当前价：${l.current_price}`}
                </div>
                <div className="flex gap-2">
                  {!isMine && l.trade_type !== 'auction' && (
                    <button onClick={() => handleBuy(l.id)} className="text-xs text-accent-success">购买</button>
                  )}
                  {l.trade_type === 'auction' && (
                    <button onClick={() => handleShowBids(l.id)} className="text-xs text-accent-purple">出价记录</button>
                  )}
                  {isMine && (
                    <button onClick={() => handleCancel(l.id)} className="text-xs text-accent-danger">取消</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && character && (
        <CreateListingModal character={character} items={items} allItems={allItems}
          onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load() }} />
      )}

      {bids && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setBids(null)}>
          <div className="bg-card p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium mb-3">出价记录</h3>
            {bids.bids.length === 0 ? <p className="text-white/30 text-sm">暂无出价</p> : (
              <div className="space-y-2">
                {bids.bids.map(b => (
                  <div key={b.id} className="flex justify-between text-sm">
                    <span>{b.bidder?.profile?.username || '?'}</span>
                    <span className="text-accent-gold">{b.bid_amount}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setBids(null)} className="btn-ghost w-full mt-3">关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateListingModal({ character, items, allItems, onClose, onDone }) {
  const [itemId, setItemId] = useState('')
  const [tradeType, setTradeType] = useState('public')
  const [wantedItemId, setWantedItemId] = useState('')
  const [startingPrice, setStartingPrice] = useState('')

  const handleCreate = async () => {
    if (!itemId) { alert('请选择道具'); return }
    try {
      await api.createMarketListing({
        item_id: parseInt(itemId), wanted_item_id: wantedItemId ? parseInt(wantedItemId) : null,
        trade_type: tradeType, starting_price: startingPrice ? parseFloat(startingPrice) : null
      })
      onDone()
    } catch (e) { alert(e.message) }
  }

  const myItems = items.filter(i => i.item?.is_tradable)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="font-medium mb-3">挂单出售</h3>
        <div className="space-y-3">
          <select className="input-field" value={itemId} onChange={e => setItemId(e.target.value)}>
            <option value="">选择道具</option>
            {myItems.map(i => <option key={i.id} value={i.item_id}>{i.item.name} x{i.quantity}</option>)}
          </select>
          <select className="input-field" value={tradeType} onChange={e => setTradeType(e.target.value)}>
            <option value="public">公开</option>
            <option value="auction">拍卖</option>
            <option value="private">私有</option>
          </select>
          {tradeType !== 'auction' && (
            <select className="input-field" value={wantedItemId} onChange={e => setWantedItemId(e.target.value)}>
              <option value="">不求换（留空）</option>
              {allItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          )}
          {tradeType === 'auction' && (
            <input className="input-field" type="number" placeholder="起拍价" value={startingPrice} onChange={e => setStartingPrice(e.target.value)} />
          )}
          <button onClick={handleCreate} className="btn-primary w-full">确认挂单</button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

export default function DateRangeFilter({ fromDate, toDate, onChange, onPreset }) {
  const getTodayStr = () => new Date().toISOString().split('T')[0]

  const setPreset = (preset) => {
    const today = new Date()
    const todayStr = getTodayStr()

    if (preset === 'TODAY') {
      onChange(todayStr, todayStr)
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(today)
      yest.setDate(yest.getDate() - 1)
      const yestStr = yest.toISOString().split('T')[0]
      onChange(yestStr, yestStr)
    } else if (preset === 'LAST_7_DAYS') {
      const d7 = new Date(today)
      d7.setDate(d7.getDate() - 6)
      onChange(d7.toISOString().split('T')[0], todayStr)
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      onChange(firstDay.toISOString().split('T')[0], todayStr)
    } else if (preset === 'ALL') {
      onChange('', '')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        background: '#FFFFFF',
        padding: '12px 18px',
        borderRadius: '16px',
        border: '1px solid rgba(61,37,30,0.12)',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--cocoa-dark)' }}>
        <span>📅</span>
        <span>Date Filter:</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onChange(e.target.value, toDate)}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(61,37,30,0.2)',
            fontSize: '12px',
            fontFamily: 'inherit',
            background: '#FFFFFF',
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => onChange(fromDate, e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(61,37,30,0.2)',
            fontSize: '12px',
            fontFamily: 'inherit',
            background: '#FFFFFF',
          }}
        />
      </div>

      {/* Quick Presets */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
          onClick={() => setPreset('TODAY')}
        >
          Today
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
          onClick={() => setPreset('YESTERDAY')}
        >
          Yesterday
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
          onClick={() => setPreset('LAST_7_DAYS')}
        >
          Last 7 Days
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
          onClick={() => setPreset('THIS_MONTH')}
        >
          This Month
        </button>
        {(fromDate || toDate) && (
          <button
            type="button"
            className="btn btn--sm"
            style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(186,27,27,0.1)', color: '#BA1B1B', fontWeight: 700 }}
            onClick={() => setPreset('ALL')}
          >
            ✕ Reset Filter
          </button>
        )}
      </div>
    </div>
  )
}

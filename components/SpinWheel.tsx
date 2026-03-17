'use client'
import { useEffect, useRef } from 'react'
import type { Prize } from '@/lib/firestore'

function lum(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return r*.299 + g*.587 + b*.114
}

export default function SpinWheel({ prizes, rotation }: { prizes: Prize[]; rotation: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const sz = c.width, cx = sz/2, cy = sz/2, r = cx - 4
    const total = prizes.reduce((s,p) => s + p.prob, 0)

    ctx.clearRect(0,0,sz,sz)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((rotation - 90) * Math.PI / 180)

    let start = 0
    prizes.forEach(p => {
      const arc = (p.prob / total) * 2 * Math.PI
      // Slice
      ctx.beginPath(); ctx.moveTo(0,0)
      ctx.arc(0, 0, r, start, start+arc)
      ctx.closePath()
      ctx.fillStyle = p.color; ctx.fill()
      ctx.strokeStyle = '#080808'; ctx.lineWidth = 2; ctx.stroke()
      // Label
      ctx.save()
      ctx.rotate(start + arc/2); ctx.textAlign = 'right'
      ctx.fillStyle = lum(p.color) > 130 ? '#111' : '#fff'
      const fs = Math.max(8, Math.min(11, r * 0.12))
      ctx.font = `700 ${fs}px 'DM Sans', sans-serif`
      const raw = p.label.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu,'').trim()
      const words = raw.split(' '); const lines: string[] = []; let ln = ''
      words.forEach(w => { if ((ln+' '+w).trim().length > 13) { if (ln) lines.push(ln.trim()); ln=w } else ln += ' '+w })
      if (ln) lines.push(ln.trim())
      const lh = fs + 3
      lines.forEach((l,i) => ctx.fillText(l, r-10, (i-(lines.length-1)/2)*lh))
      ctx.restore()
      start += arc
    })
    ctx.restore()

    // Center cap
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 2*Math.PI)
    ctx.fillStyle = '#080808'; ctx.fill()
    ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 3; ctx.stroke()
    ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🎯', cx, cy)
  }, [prizes, rotation])

  return (
    <div className="relative inline-block">
      {/* Pin */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-10 w-0 h-0"
        style={{ borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderTop:'18px solid #F5C518',
          filter:'drop-shadow(0 3px 6px rgba(245,197,24,.7))' }}/>
      <canvas ref={ref} width={280} height={280}
        className="rounded-full block shadow-[0_0_0_4px_#1c1c1c,0_0_0_6px_#252525]"
        style={{ width: 'min(280px,78vw)', height: 'min(280px,78vw)' }}/>
    </div>
  )
}

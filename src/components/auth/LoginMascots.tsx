import type { CSSProperties } from 'react'

type LoginMascotsProps = {
  eyeX: number
  eyeY: number
  lookAway: boolean
  reaction: 'idle' | 'nod' | 'shake'
}

const items = ['tv', 'solar', 'subwoofer', 'laptop'] as const

export function LoginMascots({ eyeX, eyeY, lookAway, reaction }: LoginMascotsProps) {
  return (
    <div
      className={`login-mascots ${lookAway ? 'look-away' : ''} reaction-${reaction}`}
      style={
        {
          '--eye-x': eyeX.toFixed(2),
          '--eye-y': eyeY.toFixed(2),
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="scene-floor" />
      {items.map((item, index) => (
        <div className={`stock-character stock-${item}`} key={item} style={{ '--delay': index } as CSSProperties}>
          <div className="stock-shadow" />
          <div className="stock-head">
            <div className="stock-face">
              <span className="eye left-eye">
                <span />
              </span>
              <span className="eye right-eye">
                <span />
              </span>
              <span className="mouth" />
            </div>
            <span className="hand hand-left" />
            <span className="hand hand-right" />
          </div>
        </div>
      ))}
    </div>
  )
}

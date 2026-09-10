import style from './skeleton.module.css'

export default function LoadingSkeleton() {
  return (
    <div className={style.container}>
      {/* stat pills */}
      <div className={style.statBar}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={style.statPill} />
        ))}
      </div>

      {/* search bar */}
      <div className={style.searchBar} />

      {/* industry groups */}
      {Array.from({ length: 6 }).map((_, gi) => (
        <div key={gi} className={style.group}>
          <div className={style.groupHeader}>
            <div className={style.groupTitle} />
            <div className={style.groupMeta} />
          </div>
          <div className={style.cellGrid}>
            {Array.from({ length: 8 }).map((_, ci) => (
              <div key={ci} className={style.cell} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

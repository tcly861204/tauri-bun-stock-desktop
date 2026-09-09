import { useEffect, useState, memo } from 'react'
import styles from './index.module.css'
import { formatDate } from '@/libs/utils'
import { queryApi, execApi } from '@/libs/api'

const Switch = ({ code }: { code: string | null }) => {
  const [active, setActive] = useState<boolean>(false)
  useEffect(() => {
    if (code) {
      queryApi(`SELECT is_collection FROM sector_stocks WHERE code = '${code}'`).then((res) => {
        setActive((res?.[0]?.is_collection || 0) === 1)
      })
    }
  }, [code])

  const handleToggle = () => {
    const next = !active
    setActive(next)
    if (code) {
      execApi(
        `UPDATE sector_stocks SET is_collection = ${next ? 1 : 0}, collection_date = '${formatDate()}' WHERE code = '${code}'`
      )
    }
  }
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          if (active) {
            setActive(false)
            execApi(`UPDATE sector_stocks SET is_collection = 0 WHERE code = '${code}'`)
          }
          break
        case 'ArrowRight':
          if (!active) {
            setActive(true)
            execApi(
              `UPDATE sector_stocks SET is_collection = 1, collection_date = '${formatDate()}' WHERE code = '${code}'`
            )
          }
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown, false)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, false)
    }
  }, [code, active])
  return (
    <section
      className={`${styles.switch} ${active ? styles.switchActive : ''} mr-2`}
      onClick={handleToggle}
    >
      <span className={styles.switchKnob} />
    </section>
  )
}

export default memo(Switch)

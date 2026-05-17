import { useState, useRef, useCallback, useEffect } from 'react'

const PhotoAdjuster = ({ item, onSave, onCancel }) => {
  const [offsetY, setOffsetY] = useState(item.image_offset_y ?? 50)
  const dragZoneRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const imageSrc = item.image || item.image_url

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragMove = useCallback((e) => {
    if (!isDragging || !dragZoneRef.current) return

    e.preventDefault()
    const rect = dragZoneRef.current.getBoundingClientRect()
    const clientY = e.touches?.[0]?.clientY ?? e.clientY
    const relativeY = clientY - rect.top
    const percentY = Math.max(0, Math.min(100, (relativeY / rect.height) * 100))

    setOffsetY(Math.round(percentY))
  }, [isDragging])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('touchmove', handleDragMove, { passive: false })
      window.addEventListener('touchend', handleDragEnd)

      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
        window.removeEventListener('touchmove', handleDragMove)
        window.removeEventListener('touchend', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  const handleSave = () => {
    onSave(offsetY)
  }

  const handleQuickAdjust = (delta) => {
    setOffsetY((prev) => Math.max(0, Math.min(100, prev + delta)))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: 16,
      background: '#FFFFFF',
      borderRadius: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#1F2937',
        margin: 0
      }}>
        Adjust Image for Menu Card
      </h3>

      {/* Preview: matches menu card aspect ratio (16:10) */}
      <div
        ref={dragZoneRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          width: '100%',
          aspectRatio: '16/10',
          background: '#E8E4DD',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          border: '2px solid #E5E7EB'
        }}
      >
        <img
          src={imageSrc}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `center ${offsetY}%`
          }}
          draggable={false}
        />
        {/* Vertical crop indicator */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: '#3B82F6',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
          transform: `translateY(${(offsetY / 100) * (100 * 10) / 16}%)`
        }} />
      </div>

      {/* Controls: vertical drag hint + up/down + percentage */}
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => handleQuickAdjust(-5)}
          style={{
            padding: '8px 12px',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            color: '#1F2937',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#E5E7EB' }}
          onMouseLeave={(e) => { e.target.style.background = '#F3F4F6' }}
        >
          ↑ Up
        </button>

        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#3B82F6',
          minWidth: 50,
          textAlign: 'center'
        }}>
          {offsetY}%
        </div>

        <button
          onClick={() => handleQuickAdjust(5)}
          style={{
            padding: '8px 12px',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            color: '#1F2937',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#E5E7EB' }}
          onMouseLeave={(e) => { e.target.style.background = '#F3F4F6' }}
        >
          ↓ Down
        </button>
      </div>

      <div style={{
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        Drag or use buttons to adjust vertical position
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: 8,
        paddingTop: 8
      }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#1F2937',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#E5E7EB' }}
          onMouseLeave={(e) => { e.target.style.background = '#F3F4F6' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: '#3B82F6',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#2563EB' }}
          onMouseLeave={(e) => { e.target.style.background = '#3B82F6' }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default PhotoAdjuster

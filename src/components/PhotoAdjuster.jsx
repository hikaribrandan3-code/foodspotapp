import { useState, useRef, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

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

  // Global drag listeners
  const handleMouseMove = (e) => handleDragMove(e)
  const handleMouseUp = () => handleDragEnd()
  const handleTouchMove = (e) => handleDragMove(e)
  const handleTouchEnd = () => handleDragEnd()

  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

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
      gap: 12,
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
        Adjust Image Position
      </h3>

      {/* Preview: full-width, draggable */}
      <div
        ref={dragZoneRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          width: '100%',
          aspectRatio: '1',
          background: '#E8E4DD',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
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
        {/* Crop indicator line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: '#3B82F6',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
          transform: `translateY(${(offsetY / 100) * 100}%)`
        }} />
      </div>

      {/* Minimal controls: Up/Down buttons + percentage */}
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => handleQuickAdjust(-10)}
          style={{
            padding: '6px 10px',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#1F2937',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#E5E7EB' }}
          onMouseLeave={(e) => { e.target.style.background = '#F3F4F6' }}
        >
          <ChevronUp size={12} />
        </button>

        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#3B82F6',
          minWidth: 40,
          textAlign: 'center'
        }}>
          {offsetY}%
        </div>

        <button
          onClick={() => handleQuickAdjust(10)}
          style={{
            padding: '6px 10px',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#1F2937',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#E5E7EB' }}
          onMouseLeave={(e) => { e.target.style.background = '#F3F4F6' }}
        >
          <ChevronDown size={12} />
        </button>
      </div>

      <div style={{
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        Drag image to adjust crop position
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

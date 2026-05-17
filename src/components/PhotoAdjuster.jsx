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
        Adjust Image Position
      </h3>

      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start'
      }}>
        {/* Preview: 1:1 square with offset applied */}
        <div style={{
          flex: 1,
          aspectRatio: '1',
          background: '#E8E4DD',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}>
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
          {/* Current offset indicator */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(to bottom, transparent 0%, rgba(59, 130, 246, 0.5) ${offsetY}%, transparent 100%)`,
            pointerEvents: 'none'
          }} />
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minWidth: 80
        }}>
          <button
            onClick={() => handleQuickAdjust(-10)}
            style={{
              padding: '8px 12px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 12,
              color: '#1F2937',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.background = '#E5E7EB' }}
            onMouseLeave={(e) => { e.target.style.background = '#F3F4F6' }}
          >
            <ChevronUp size={14} /> Up
          </button>

          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#3B82F6',
            textAlign: 'center'
          }}>
            {offsetY}%
          </div>

          <button
            onClick={() => handleQuickAdjust(10)}
            style={{
              padding: '8px 12px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 12,
              color: '#1F2937',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.background = '#E5E7EB' }}
            onMouseLeave={(e) => { e.target.style.background = '#F3F4F6' }}
          >
            <ChevronDown size={14} /> Down
          </button>
        </div>
      </div>

      {/* Drag zone */}
      <div
        ref={dragZoneRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          height: 120,
          background: 'linear-gradient(to bottom, #F0F9FF, #FFFFFF, #F0F9FF)',
          border: '2px solid #DBEAFE',
          borderRadius: 12,
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            fontSize: 12,
            color: '#94A3B8',
            fontWeight: 500
          }}>
            Drag to adjust
          </div>
        </div>

        {/* Indicator marker at current position */}
        <div
          style={{
            position: 'absolute',
            top: `${(offsetY / 100) * 120}px`,
            left: 0,
            right: 0,
            height: '3px',
            background: '#3B82F6',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.3)',
            borderRadius: 2,
            pointerEvents: 'none',
            transition: isDragging ? 'none' : 'top 0.15s ease'
          }}
        />
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

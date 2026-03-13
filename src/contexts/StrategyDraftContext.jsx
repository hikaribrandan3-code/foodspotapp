import { createContext, useContext, useState, useEffect } from 'react'

const StrategyDraftContext = createContext()

export function StrategyDraftProvider({ children }) {
    const [activeDraft, setActiveDraft] = useState(() => {
        const saved = localStorage.getItem('active_strategy_draft')
        return saved ? JSON.parse(saved) : null
    })

    const [studioMode, setStudioMode] = useState(false)

    useEffect(() => {
        if (activeDraft) {
            localStorage.setItem('active_strategy_draft', JSON.stringify(activeDraft))
        } else {
            localStorage.removeItem('active_strategy_draft')
        }
    }, [activeDraft])

    const ingestAIDraft = (payload) => {
        console.log('🧠 [StrategyDraft] Ingesting AI Draft:', payload)
        setActiveDraft(payload)
    }

    const launchStudio = () => {
        console.log('🚀 [StrategyDraft] Launching Studio with Draft:', activeDraft)
        setStudioMode(true)
    }

    const clearDraft = () => {
        setActiveDraft(null)
        setStudioMode(false)
    }

    return (
        <StrategyDraftContext.Provider value={{
            activeDraft,
            studioMode,
            setStudioMode,
            ingestAIDraft,
            launchStudio,
            clearDraft
        }}>
            {children}
        </StrategyDraftContext.Provider>
    )
}

export const useStrategyDraft = () => {
    const context = useContext(StrategyDraftContext)
    if (!context) {
        throw new Error('useStrategyDraft must be used within a StrategyDraftProvider')
    }
    return context
}

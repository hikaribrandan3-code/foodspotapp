import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Play } from 'lucide-react'
import BackendHeader from '../../components/BackendHeader'
import BackendNav from '../../components/BackendNav'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTenant } from '../../contexts/TenantContext'

/**
 * Owner Tutorials - Basic setup guides
 * 5 essential videos for a small crew
 */
const OWNER_TUTORIALS = [
  {
    id: 'menu-setup',
    title: 'Add Menu Item',
    description: 'Learn how to add items, photos, and prices to your menu',
    duration: '2:30',
    category: 'Setup'
  },
  {
    id: 'add-logo',
    title: 'Add Your Logo',
    description: 'Upload your restaurant logo and set up branding',
    duration: '1:45',
    category: 'Setup'
  },
  {
    id: 'kds-overview',
    title: 'Kitchen Display System',
    description: 'See what your staff sees when orders come in',
    duration: '3:15',
    category: 'Operations'
  },
  {
    id: 'view-orders',
    title: 'View Orders & Revenue',
    description: 'Check your daily orders and make sure you\'re making money',
    duration: '2:00',
    category: 'Operations'
  }
]

function TutorialCard({ tutorial, onPlay }) {
  return (
    <div
      className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onPlay(tutorial.id)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
            {tutorial.category}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {tutorial.title}
          </h3>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/40 transition-colors">
          <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-current" />
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        {tutorial.description}
      </p>
      <div className="text-xs text-slate-500 dark:text-slate-500">
        {tutorial.duration}
      </div>
    </div>
  )
}

export default function OwnerTutorials() {
  const navigate = useNavigate()
  const { tenantSlug } = useParams()
  const { t } = useLanguage()
  const { businessId } = useTenant()
  const [selectedTutorial, setSelectedTutorial] = useState(null)

  const handlePlayTutorial = (tutorialId) => {
    setSelectedTutorial(tutorialId)
  }

  const handleClose = () => {
    setSelectedTutorial(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <BackendHeader title="Tutorials" />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Getting Started
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Watch our quick guides to set up your restaurant and manage operations
          </p>
        </div>

        <div className="space-y-4">
          {OWNER_TUTORIALS.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              onPlay={handlePlayTutorial}
            />
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-3">
            <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                Videos Coming Soon
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                We're creating high-quality tutorial videos. Check back soon!
              </p>
            </div>
          </div>
        </div>
      </main>

      <BackendNav role="owner" useRoutes={true} />

      {/* TODO: Modal video player will go here */}
      {selectedTutorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {OWNER_TUTORIALS.find(t => t.id === selectedTutorial)?.title}
              </h2>
              <button
                onClick={handleClose}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">
                  Video player component here
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

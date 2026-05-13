import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TRANSLATIONS = {
  en: {
    title: 'Forgot Password?',
    subtitle: "Don't worry, it happens to the best of us. Enter your email to reset it.",
    email: 'Email',
    emailPlaceholder: 'Enter your email address',
    sendReset: 'Send Reset Link',
    backToLogin: 'Back to Login',
    location: 'Córdoba, Argentina'
  },
  es: {
    title: '¿Olvidaste tu contraseña?',
    subtitle: 'No te preocupes, le pasa a los mejores. Ingresa tu email para restablecerla.',
    email: 'Correo electrónico',
    emailPlaceholder: 'Ingresa tu dirección de email',
    sendReset: 'Enviar enlace de restablecimiento',
    backToLogin: 'Volver al inicio de sesión',
    location: 'Córdoba, Argentina'
  },
  pt: {
    title: 'Esqueceu a senha?',
    subtitle: 'Não se preocupe, acontece com os melhores. Digite seu email para redefini-la.',
    email: 'Email',
    emailPlaceholder: 'Digite seu endereço de email',
    sendReset: 'Enviar link de redefinição',
    backToLogin: 'Voltar ao login',
    location: 'Córdoba, Argentina'
  }
}

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState('en')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const l = TRANSLATIONS[lang]

  const cycleLang = () => {
    setLang(prev => prev === 'en' ? 'es' : prev === 'es' ? 'pt' : 'en')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Password reset logic will go here
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white relative">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Background"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida/ADBb0uhhpgNNMYRQ-lR6Vqmp2NpPewOT5p1A9awoNA1Ylqhh7qtCNsR4Ztj97n9cKjgxnny8jqrjnCJFHOAVqDHGY4jqw8IGRTtyKHvX1S9TN8lw3DqUVeMNK7djrE0ze_K09Ha28XKOyEiZyYpkK9dMBrgzSnk3rg8WW4S7QQ5SVBuG9HHNBrMPaDsQjJk7xr0vblLoi4OK_3-TjKtxQ3x02G5Ub7kstra9xXleDDMB6R3KZNvSIWGsFcOqfA"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Language Switcher */}
      <button
        onClick={cycleLang}
        className="fixed top-4 right-4 bg-gray-600 hover:bg-gray-700 text-white rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors z-40"
      >
        <span>🌐</span>
        {lang.toUpperCase()}
      </button>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 md:px-8 py-6 max-w-lg mx-auto w-full">
        <div className="mb-6 text-center">
          <h1 style={{ color: '#ffffff' }} className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">
            {l.title}
          </h1>
          <p style={{ color: '#ffffff' }} className="drop-shadow-sm">{l.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {l.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={l.emailPlaceholder}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-all duration-200 active:scale-95 mt-6 shadow-sm"
            >
              {loading ? 'Sending...' : l.sendReset}
            </button>

            <div className="text-center mt-4">
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-1 text-green-600 hover:text-green-700 font-semibold text-sm"
              >
                <span>←</span>
                {l.backToLogin}
              </a>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full bg-gray-50 border-t border-gray-200 py-6 px-4 text-center">
        <p className="text-gray-600 text-sm mb-2">FoodSpot Mobile</p>
        <div className="flex flex-wrap justify-center gap-4 mb-4 text-xs text-gray-600">
          <a href="#" className="hover:text-green-600">Privacy</a>
          <a href="#" className="hover:text-green-600">Terms</a>
          <a href="#" className="hover:text-green-600">Location</a>
          <a href="#" className="hover:text-green-600">Language</a>
        </div>
        <p className="text-gray-500 text-xs">
          © 2025 FoodSpot Mobile. All rights reserved. 📍 {l.location}
        </p>
      </footer>
    </div>
  )
}

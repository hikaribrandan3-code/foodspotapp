import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TRANSLATIONS = {
  en: {
    welcomeBack: 'Welcome Back to FoodSpot!',
    subheadline: 'Your menu. Their content. Your growth.',
    login: 'Log In',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgotPassword: 'Forgot password?',
    loginButton: 'Log In',
    noAccount: "Don't have an account?",
    signup: 'Sign up',
    location: 'Córdoba, Argentina'
  },
  es: {
    welcomeBack: '¡Bienvenido de vuelta a FoodSpot!',
    subheadline: 'Tu menú. Su contenido. Tu crecimiento.',
    login: 'Iniciar sesión',
    email: 'Correo electrónico',
    emailPlaceholder: 'Ingresa tu email',
    password: 'Contraseña',
    passwordPlaceholder: 'Ingresa tu contraseña',
    forgotPassword: 'Olvidé mi contraseña',
    loginButton: 'Iniciar sesión',
    noAccount: '¿No tienes una cuenta?',
    signup: 'Regístrate',
    location: 'Córdoba, Argentina'
  },
  pt: {
    welcomeBack: 'Bem-vindo de volta ao FoodSpot!',
    subheadline: 'Seu menu. Seu conteúdo. Seu crescimento.',
    login: 'Fazer Login',
    email: 'Email',
    emailPlaceholder: 'Digite seu email',
    password: 'Senha',
    passwordPlaceholder: 'Digite sua senha',
    forgotPassword: 'Esqueceu a senha?',
    loginButton: 'Fazer Login',
    noAccount: 'Não tem uma conta?',
    signup: 'Cadastre-se',
    location: 'Córdoba, Argentina'
  }
}

export default function LoginPage() {
  const [lang, setLang] = useState('en')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const l = TRANSLATIONS[lang]

  const cycleLang = () => {
    setLang(prev => prev === 'en' ? 'es' : prev === 'es' ? 'pt' : 'en')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Auth logic will go here
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero Section */}
      <div
        className="relative w-full h-[280px] md:h-[35vh] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: "url('https://lh3.googleusercontent.com/aida/ADBb0uhhpgNNMYRQ-lR6Vqmp2NpPewOT5p1A9awoNA1Ylqhh7qtCNsR4Ztj97n9cKjgxnny8jqrjnCJFHOAVqDHGY4jqw8IGRTtyKHvX1S9TN8lw3DqUVeMNK7djrE0ze_K09Ha28XKOyEiZyYpkK9dMBrgzSnk3rg8WW4S7QQ5SVBuG9HHNBrMPaDsQjJk7xr0vblLoi4OK_3-TjKtxQ3x02G5Ub7kstra9xXleDDMB6R3KZNvSIWGsFcOqfA')"
        }}
      >
        <div className="absolute inset-0 bg-black/60 z-0" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">
            {l.welcomeBack}
          </h1>
          <p className="text-white/90 text-lg drop-shadow-sm">{l.subheadline}</p>
        </div>
      </div>

      {/* Language Switcher */}
      <button
        onClick={cycleLang}
        className="fixed top-4 right-4 bg-gray-600 hover:bg-gray-700 text-white rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors z-40"
      >
        <span>🌐</span>
        {lang.toUpperCase()}
      </button>

      {/* Form Section */}
      <main className="flex-grow w-full max-w-md mx-auto px-4 relative z-10 -mt-8 mb-12">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{l.login}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">{l.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={l.emailPlaceholder}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">{l.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={l.passwordPlaceholder}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <a href="/forgot-password" className="text-sm font-semibold text-green-600 hover:text-green-700">
                {l.forgotPassword}
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95 mt-6 shadow-sm"
            >
              {loading ? 'Loading...' : l.loginButton}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              {l.noAccount}{' '}
              <a href="/" className="font-semibold text-green-600 hover:text-green-700">
                {l.signup}
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-50 border-t border-gray-200 py-6 px-4 text-center">
        <p className="text-gray-600 text-sm mb-2">FoodSpot Mobile</p>
        <p className="text-gray-500 text-xs">© 2025 FoodSpot Mobile. All rights reserved.</p>
        <p className="text-gray-500 text-xs mt-1">📍 {l.location}</p>
      </footer>
    </div>
  )
}

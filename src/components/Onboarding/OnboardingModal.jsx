import React, { useState, useEffect, useRef } from 'react';

// Lightweight Canvas Confetti
const CanvasConfetti = ({ isActive }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#fcd34d', '#f87171'];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.size = Math.random() * 8 + 4;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 5 + 3;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
      }
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
      }
    }

    for (let i = 0; i < 150; i++) {
      particles.push(new Particle());
    }

    let animationFrame;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.y > canvas.height) {
          particles[index] = new Particle();
        }
      });
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[110]"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const STEPS = [
  {
    id: 'businessName',
    title: '¿Nombre del negocio?',
    subtitle: 'Ayúdanos a entender mejor tu negocio',
    type: 'text',
    placeholder: 'ej. Café Esmeralda',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'phoneNumber',
    title: '¿Número de teléfono de contacto?',
    subtitle: 'Para que podamos comunicarnos contigo cuando lo necesites',
    type: 'text',
    placeholder: 'ej. +54 9 351 234 5678',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1577720643272-265ff904b1b8?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'businessType',
    title: '¿Qué tipo de negocio de comida diriges?',
    subtitle: 'Elige el estilo de tu restaurante—nos adaptamos a ti',
    type: 'options',
    options: ['Servicio Rápido', 'Cena Informal', 'Cena Elegante', 'Cafetería', 'Panadería', 'Food Truck', 'Tienda de Postres', 'Otro'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'duration',
    title: '¿Cuánto tiempo llevas en el negocio?',
    subtitle: "Ya sea que lances mañana o lleves años prosperando, FoodSpot escala contigo",
    type: 'options',
    options: ['Menos de 6 meses', '6 meses - 1 año', '1-3 años', '3-5 años', '5+ años'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'serviceType',
    title: '¿Cómo atiendes a tus clientes?',
    subtitle: 'Un sistema operativo para cada forma en que operas',
    type: 'options',
    options: ['En el local', 'Para llevar', 'Entrega a domicilio', 'Local + Para llevar', 'Todos los servicios'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'socialMedia',
    title: '¿Estás en redes sociales?',
    subtitle: 'Tus clientes SON tu marketing',
    description: 'Ellos fotografían su comida. Tú obtienes el contenido.',
    type: 'options',
    options: ['Sí, somos activos', 'Aún no', 'Planeamos estarlo'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=1000'
  }
];

const LAST_STEPS = [
  {
    id: 'priorAppUsage',
    title: '¿Has usado alguna aplicación para tu negocio antes?',
    subtitle: 'Creado por personas que entienden los restaurantes. Diferente al resto.',
    type: 'options',
    options: ['Sí', 'No', 'No estoy seguro'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'events',
    title: '¿Sueles organizar eventos o espectáculos?',
    subtitle: 'Convierte tu espacio en una experiencia.',
    description: 'Crea eventos. Vende boletos. Construye otra fuente de ingresos.',
    type: 'options',
    options: ['Sí, regularmente', 'Ocasionalmente', 'Planeamos hacerlo', 'No'],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1000'
  }
];

const ALL_STEPS = [...STEPS, ...LAST_STEPS];

export default function OnboardingModal({ onComplete, isOpen }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    phoneNumber: '',
    businessType: '',
    duration: '',
    serviceType: '',
    socialMedia: '',
    priorAppUsage: '',
    events: ''
  });

  // Loading/error state for final submit (MUST be before early return)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Reset state when modal reopens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setShowSuccess(false);
      setFormData({
        businessName: '',
        phoneNumber: '',
        businessType: '',
        duration: '',
        serviceType: '',
        socialMedia: '',
        priorAppUsage: '',
        events: ''
      });
      setSubmitError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Check if current field is filled
  const isCurrentFieldFilled = () => {
    const currentFieldId = ALL_STEPS[currentStep].id;
    return formData[currentFieldId] && formData[currentFieldId].trim() !== '';
  };

  // Check if all fields are filled
  const areAllFieldsFilled = () => {
    return Object.values(formData).every(value => value && value.trim() !== '');
  };

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < ALL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      if (!areAllFieldsFilled()) return;
      setShowSuccess(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleOptionSelect = (option) => {
    setFormData(prev => ({ ...prev, [ALL_STEPS[currentStep].id]: option }));
    // Manual advance only — user clicks Continue button
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [ALL_STEPS[currentStep].id]: e.target.value }));
  };

  const handleFinalSuccess = async () => {
    if (!areAllFieldsFilled()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onComplete(formData);
    } catch (err) {
      console.error('[OnboardingModal] onComplete failed:', err);
      setSubmitError(err?.message || 'Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <CanvasConfetti isActive={true} />
        <div className="relative w-full max-w-xl overflow-hidden bg-white shadow-2xl rounded-3xl flex flex-col p-10 items-center text-center transition-all scale-in duration-300 z-[120]">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
            ¡Todo listo!
          </h2>
          <p className="text-gray-500 mb-8 max-w-sm text-sm">
            Tu perfil ha sido configurado correctamente. Haz clic abajo para finalizar y empezar.
          </p>
          {submitError && (
            <p className="text-red-600 text-sm font-semibold mb-4 bg-red-50 px-4 py-3 rounded-xl">
              {submitError}
            </p>
          )}
          <button
            onClick={handleFinalSuccess}
            disabled={isSubmitting}
            className={`w-full py-4 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] outline-none ${
              isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSubmitting ? 'Creando tu negocio...' : 'Abrir Negocio'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl overflow-hidden bg-white shadow-2xl rounded-3xl flex flex-col md:flex-row h-[90vh] md:h-[600px] transition-all scale-in duration-300">
        
        {/* Left Side: Visual Experience */}
        <div className="relative w-full md:w-1/2 h-48 md:h-full overflow-hidden shrink-0">
          <img
            key={currentStep}
            src={ALL_STEPS[currentStep].image}
            alt="Business Context"
            className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent" />
          
          {/* Progress Overlaid on Image */}
          <div className="absolute top-6 left-0 right-0 px-2 md:px-8">
            <div className="flex justify-center gap-1 md:gap-2 px-2 md:px-6 py-3 bg-white/95 backdrop-blur-md rounded-full w-fit mx-auto shadow-md border border-emerald-600/10">
              {ALL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index <= currentStep ? 'w-5 md:w-8 bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.2)]' : 'w-2 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Heading Content Overlaid on Image */}
          <div className="absolute bottom-6 left-0 right-0 px-8 text-center">
            <div className="transition-all duration-500 transform translate-y-0 opacity-100">
              {currentStep === 0 ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-none mb-1">
                    Bienvenido a FoodSpot
                  </h2>
                  <p className="text-sm sm:text-base font-medium text-gray-700">
                    {ALL_STEPS[currentStep].subtitle}
                  </p>
                </>
              ) : (
                <p className="text-lg sm:text-xl font-bold text-gray-900 max-w-xs mx-auto leading-tight uppercase tracking-tight">
                  {ALL_STEPS[currentStep].subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Form */}
        <div className="flex flex-col flex-1 min-h-0 p-6 sm:p-10 bg-white">
          <div className="flex-1 overflow-y-auto min-h-0 py-4 custom-scrollbar">
            <div className="min-h-full flex flex-col justify-center">
              <div className="transition-all duration-500 transform opacity-100 translate-y-0">
                <div className="flex flex-col items-center mb-6">
                  <div className="p-3 mb-3 rounded-2xl bg-emerald-50 shrink-0">
                    {React.cloneElement(ALL_STEPS[currentStep].icon, { className: "w-8 h-8 text-emerald-600" })}
                  </div>
                  <h3 className="text-lg font-semibold text-center text-gray-900 px-4">
                    {ALL_STEPS[currentStep].title}
                  </h3>
                  {ALL_STEPS[currentStep].description && (
                    <p className="mt-1 text-xs text-center text-gray-500 max-w-xs mx-auto italic font-medium px-4">
                      {ALL_STEPS[currentStep].description}
                    </p>
                  )}
                </div>

                {ALL_STEPS[currentStep].type === 'text' ? (
                  <div className="w-full max-w-sm mx-auto px-4">
                    <input
                      autoFocus
                      type="text"
                      value={formData[ALL_STEPS[currentStep].id]}
                      onChange={handleChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      placeholder={ALL_STEPS[currentStep].placeholder}
                      className="w-full px-4 py-3 text-lg transition-all border-2 border-gray-100 outline-none rounded-xl focus:border-emerald-600 focus:ring-4 focus:ring-gray-100 bg-gray-50"
                    />
                    <p className="mt-3 text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                      Presiona Enter para continuar
                    </p>
                    
                    {currentStep === 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                          Córdoba Capital, Argentina
                        </p>
                        <p className="text-xs text-gray-400 font-bold mt-1">
                          Contáctenos para ayuda: 351-212-2600
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`grid gap-2 w-full max-w-md mx-auto px-4 ${ALL_STEPS[currentStep].options.length > 4 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {ALL_STEPS[currentStep].options.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleOptionSelect(option)}
                        className={`flex items-center justify-between px-4 py-3 text-sm font-semibold transition-all border-2 rounded-xl group outline-none ${
                          formData[ALL_STEPS[currentStep].id] === option
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-gray-100 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/30'
                        }`}
                      >
                        <span className="text-left leading-tight pr-2">{option}</span>
                        {formData[ALL_STEPS[currentStep].id] === option && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-50">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all outline-none ${
                currentStep === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Atrás
            </button>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleNext}
                disabled={!isCurrentFieldFilled()}
                className={`flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-widest transition-all rounded-xl border-2 outline-none ${
                  isCurrentFieldFilled()
                    ? 'bg-emerald-600 text-white border-white hover:bg-emerald-700 active:scale-95 shadow-md shadow-black/10 cursor-pointer'
                    : 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                {currentStep === ALL_STEPS.length - 1 ? (
                  <>
                    Continuar
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </>
                ) : (
                  <>
                    Siguiente
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

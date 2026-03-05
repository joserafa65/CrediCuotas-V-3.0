import React from "react";
import { useState, useRef } from "react";

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const slides = [
    { image: "/CREDICUOTAS-ON-BOARDING-SCREENS-01.jpg", alt: "Planifica tus préstamos" },
    { image: "/CREDICUOTAS-ON-BOARDING-SCREENS-02.jpg", alt: "Calcula cuotas reales" },
    { image: "/CREDICUOTAS-ON-BOARDING-SCREENS-04.jpg", alt: "Cuantifica beneficios" }
  ];

  const goToNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection("left");
      setCurrentSlide((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const goToPrev = () => {
    if (currentSlide > 0) {
      setDirection("right");
      setCurrentSlide((prev) => prev - 1);
    }
  };

  // TOUCH HANDLERS
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) < 40) return; // sensibilidad mínima

    if (diff > 40) goToNext(); // swipe left
    else if (diff < -40) goToPrev(); // swipe right
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden select-none">
      <div className="relative w-full max-w-2xl px-4">

        {/* SLIDES CON SLIDE ANIMATION */}
        <div
          className="relative w-full h-auto overflow-hidden rounded-2xl shadow-2xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={goToNext}
        >
          <div
            className="flex transition-transform duration-300"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`
            }}
          >
            {slides.map((slide, index) => (
              <img
                key={index}
                src={slide.image}
                alt={slide.alt}
                className="w-full flex-shrink-0 rounded-2xl"
              />
            ))}
          </div>

          {/* SKIP BUTTON */}
          <button
            onClick={onComplete}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Saltar
          </button>
        </div>

        {/* INDICADORES DE PUNTOS */}
        <div className="flex justify-center gap-2 mt-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentSlide ? "w-8 bg-turquoise" : "w-2 bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* TEXTO INFERIOR */}
        <p className="text-center text-gray-400 mt-4 text-sm">
          {currentSlide < slides.length - 1
            ? "Desliza o toca para avanzar →"
            : "Toca para comenzar"}
        </p>
      </div>
    </div>
  );
};
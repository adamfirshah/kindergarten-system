import ThemeToggle from '../components/ThemeToggle'
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import login1 from "../assets/login1.png";
import login2 from "../assets/login2.png";
import login3 from "../assets/login3.png";
import logoBlue from "../assets/logo-green.png";

function IconLogin({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M15 3h4a1 1 0 011 1v16a1 1 0 01-1 1h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 17l5-5-5-5M15 12H3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SLIDES = [
  {
    image: login1,
    title: "Real-time Tracking",
    subtitle: "Monitor attendance & updates instantly",
  },
  {
    image: login2,
    title: "Smart Management",
    subtitle: "Manage classes, staff & payments in one place",
  },
  {
    image: login3,
    title: "Stay Connected",
    subtitle: "Parents and teachers, always in sync",
  },
];

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) setError(signInError.message);
    setLoading(false);
  }

  const slide = SLIDES[slideIndex];

  return (
    <div className="login-shell relative min-h-svh overflow-hidden">
      {/* Background slideshow — one image per slide */}
      <div className="absolute inset-0">
        {SLIDES.map((item, i) => (
          <img
            key={item.image}
            src={item.image}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
              i === slideIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="login-theme-control"><ThemeToggle /></div>

      {/* Hero text — left half, sits behind the overlapping login panel */}
      <div className="relative z-10 hidden min-h-svh w-1/2 flex-col items-center justify-between px-10 py-10 lg:flex">
        <span className="rounded-full bg-[#C3D3A4] px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-[#174B2B]">
          Platform for Academic & Parental Access
        </span>

        <div className="login-slide-copy max-w-md text-center">
          <h2
            key={slide.title}
            className="animate-[fadeIn_0.6s_ease] text-4xl font-bold leading-tight text-[#FAF4E8] xl:text-[2.75rem]"
          >
            {slide.title}
          </h2>
          <p
            key={slide.subtitle}
            className="animate-[fadeIn_0.6s_ease] mt-3 text-base font-normal text-[#FAF4E8]"
          >
            {slide.subtitle}
          </p>
        </div>

        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlideIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === slideIndex ? "w-6 bg-[#C3D3A4]" : "w-2 bg-[#C3D3A4]/35"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Login panel — 50% width, overlaps the image from the right */}
      <div className="relative z-20 flex min-h-svh w-full flex-col bg-[#FAF4E7] lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-1/2 lg:rounded-tl-[80px] lg:rounded-bl-[80px] lg:shadow-[-16px_0_48px_rgba(0,0,0,0.18)]">
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 sm:px-14">
          <img
            src={logoBlue}
            alt="PAPA"
            className="mb-10 h-12 w-auto object-contain"
          />

          <span className="text-center">
            Platform for Academic & Parental Access
          </span>

          <div className="w-full max-w-[360px] text-left">
            <p className="text-[2.0rem] font-normal leading-snug text-[#333]">
              Welcome Back
            </p>
            <p className="mt-1.5 text-sm font-normal text-[#888]">
              Enter your email and password to access
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-small text-[#333]"
              >
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Please enter your email"
                className="w-full rounded-[10px] border border-[#DDD] bg-white px-4 py-3.5 text-sm font-normal text-[#333] outline-none transition placeholder:text-[#AAA] focus:border-[#638753] focus:ring-2 focus:ring-[#638753]/25"
              />

              <label
                htmlFor="password"
                className="mb-2 block text-sm font-small text-[#333]"
              >
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Please enter your password"
                className="w-full rounded-[10px] border border-[#DDD] bg-white px-4 py-3.5 text-sm font-normal text-[#333] outline-none transition placeholder:text-[#AAA] focus:border-[#638753] focus:ring-2 focus:ring-[#638753]/25"
              />

              {error && (
                <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#174B2B] py-3.5 text-sm font-semibold text-[#E8E8E8] transition hover:bg-[#C3D3A4] hover:text-[#174B2B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconLogin />
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>
          </div>
        </div>

        <div className="px-8 pb-6 text-right sm:px-14">
          <p className="text-[11px] font-normal text-[#AAA]">
            © 2026 PAPA Kindergarten System
          </p>
          <p className="text-[11px] font-normal text-[#CCC]">v1.0.0</p>
        </div>
      </div>
    </div>
  );
}

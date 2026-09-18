import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export function DeveloperPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playBtnRef = useRef<HTMLDivElement | null>(null);
  const actionButtonsRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const bgPreviewRef = useRef<HTMLDivElement | null>(null);

  const [previewText, setPreviewText] = useState('');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  const addTimeout = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  const runAnimationSequence = () => {
    const canvas = canvasRef.current;
    const playBtn = playBtnRef.current;
    const actionButtons = actionButtonsRef.current;
    if (!canvas || !playBtn || !actionButtons) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    playBtn.classList.add('hidden');
    actionButtons.classList.remove('visible');

    const width = 1200;
    const height = 320;
    canvas.width = width;
    canvas.height = height;

    const FONT_FAMILY = 'Cinzel, Georgia, serif';
    const FONT_SIZE = 64;

    function getLetterPositions(text: string, fontSize: number) {
      if (!ctx) return [];
      ctx.font = `400 ${fontSize}px ${FONT_FAMILY}`;
      const totalWidth = ctx.measureText(text).width;
      let currentX = (width - totalWidth) / 2;

      return text.split('').map((char) => {
        const charWidth = ctx.measureText(char).width;
        const pos = { char, x: currentX + charWidth / 2, width: charWidth };
        currentX += charWidth;
        return pos;
      });
    }

    const text1 = 'HE';
    const text2 = 'HE IS';
    const text3 = 'AHMED AL JASSEM';

    const pos1 = getLetterPositions(text1, FONT_SIZE);
    const pos2 = getLetterPositions(text2, FONT_SIZE);
    const pos3 = getLetterPositions(text3, FONT_SIZE);

    const startTime = performance.now();

    const t1 = 800;
    const t2 = 1400;
    const t3 = 2000;
    const t4 = 3600;
    const t5 = 4200;

    function draw(now: number) {
      if (!ctx) return;
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      if (elapsed < t1) {
        const progress = Math.min(elapsed / t1, 1);
        ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.font = `400 ${FONT_SIZE}px ${FONT_FAMILY}`;
        pos1.forEach((l) => ctx.fillText(l.char, l.x, height / 2));
      } else if (elapsed < t2) {
        const progress = (elapsed - t1) / (t2 - t1);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

        ctx.font = `400 ${FONT_SIZE}px ${FONT_FAMILY}`;

        for (let i = 0; i < 2; i++) {
          const x = pos1[i].x + (pos2[i].x - pos1[i].x) * ease;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(pos1[i].char, x, height / 2);
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        if (pos2[3]) ctx.fillText(pos2[3].char, pos2[3].x, height / 2);
        if (pos2[4]) ctx.fillText(pos2[4].char, pos2[4].x, height / 2);
      } else if (elapsed < t3) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `400 ${FONT_SIZE}px ${FONT_FAMILY}`;
        pos2.forEach((l) => ctx.fillText(l.char, l.x, height / 2));
      } else if (elapsed < t4) {
        const progress = (elapsed - t3) / (t4 - t3);
        const ease = Math.pow(progress, 2);

        ctx.font = `400 ${FONT_SIZE}px ${FONT_FAMILY}`;

        pos3.forEach((target, i) => {
          const startX = pos2[Math.min(i, pos2.length - 1)].x;
          const currentX = startX + (target.x - startX) * ease;

          const blur = Math.sin(progress * Math.PI) * 4;
          ctx.filter = `blur(${blur}px)`;

          ctx.fillStyle = '#ffffff';
          ctx.fillText(target.char, currentX, height / 2);
        });

        ctx.filter = 'none';
      } else {
        const colorProgress = Math.min((elapsed - t4) / (t5 - t4), 1);

        const r = Math.round(255 + (43 - 255) * colorProgress);
        const g = Math.round(255 + (127 - 255) * colorProgress);
        const b = Math.round(255 + (255 - 255) * colorProgress);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.font = `700 ${FONT_SIZE}px ${FONT_FAMILY}`;

        pos3.forEach((l) => ctx.fillText(l.char, l.x, height / 2));

        if (colorProgress >= 1) {
          actionButtons.classList.add('visible');
        }
      }

      if (elapsed < t5 + 500) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);
  };

  const simulateMouseInteraction = () => {
    const playBtn = playBtnRef.current;
    const cursor = cursorRef.current;
    if (!playBtn || !cursor) return;

    cursor.classList.remove('hidden');
    playBtn.classList.remove('hidden', 'hovered', 'clicked');

    const rect = playBtn.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    const scenarios = [
      { x: window.innerWidth * 0.9, y: window.innerHeight * 0.8 },
      { x: window.innerWidth * 0.5, y: -50 },
      { x: -50, y: window.innerHeight * 0.6 },
      { x: window.innerWidth * 0.2, y: window.innerHeight + 50 },
      { x: window.innerWidth + 50, y: -50 },
    ];

    const startPos = scenarios[Math.floor(Math.random() * scenarios.length)];
    const controlX = (startPos.x + targetX) / 2 + (Math.random() - 0.5) * 300;
    const controlY = (startPos.y + targetY) / 2 + (Math.random() - 0.5) * 300;

    const duration = 1300;
    const startTime = performance.now();

    function moveCursor(now: number) {
      if (!cursor || !playBtn) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentX =
        (1 - ease) * (1 - ease) * startPos.x +
        2 * (1 - ease) * ease * controlX +
        ease * ease * targetX;
      const currentY =
        (1 - ease) * (1 - ease) * startPos.y +
        2 * (1 - ease) * ease * controlY +
        ease * ease * targetY;

      cursor.style.transform = `translate(${currentX}px, ${currentY}px)`;

      if (progress < 1) {
        requestAnimationFrame(moveCursor);
      } else {
        playBtn.classList.add('hovered');

        addTimeout(() => {
          playBtn.classList.add('clicked');

          addTimeout(() => {
            playBtn.classList.remove('clicked', 'hovered');
            cursor.classList.add('hidden');
            runAnimationSequence();
          }, 180);
        }, 250);
      }
    }

    cursor.style.transform = `translate(${startPos.x}px, ${startPos.y}px)`;

    addTimeout(() => {
      requestAnimationFrame(moveCursor);
    }, 400);
  };

  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Ahmed Al Jassem | Developer';

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1200;
      canvas.height = 320;
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        simulateMouseInteraction();
      });
    } else {
      simulateMouseInteraction();
    }

    return () => {
      document.title = originalTitle;
      clearAllTimeouts();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (text: string) => {
    setPreviewText(text);
    setIsPreviewVisible(true);
  };

  const handleMouseLeave = () => {
    setIsPreviewVisible(false);
  };

  return (
    <div
      dir="ltr"
      className="developer-root relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-black text-white selection:bg-[#2B7FFF] selection:text-white"
      style={{ fontFamily: "'Cinzel', serif" }}
      data-testid="page-developer"
    >
      {/* Embedded 100% exact styles matching the original HTML */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

        .developer-root {
          background-color: #000;
          font-family: 'Cinzel', serif;
        }

        .bg-preview {
          position: absolute;
          left: 6%;
          top: 32%;
          transform: translateY(-50%);
          font-family: 'Inter', sans-serif;
          font-size: 3.2rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.03);
          pointer-events: none;
          user-select: none;
          z-index: 1;
          white-space: nowrap;
          transition: 
            opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), 
            transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), 
            color 0.5s cubic-bezier(0.16, 1, 0.3, 1),
            text-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          text-shadow: 0 0 30px rgba(43, 127, 255, 0);
        }

        .bg-preview.visible {
          opacity: 1;
          transform: translateY(-50%) translateX(12px);
          color: rgba(255, 255, 255, 0.09);
          text-shadow: 0 0 45px rgba(43, 127, 255, 0.2);
        }

        .wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 1200px;
          z-index: 2;
        }

        .dev-canvas {
          display: block;
          background: transparent;
          max-width: 100%;
          height: auto;
        }

        .play-btn {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70px;
          height: 70px;
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid #fff;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          z-index: 10;
          transition: opacity 0.3s ease, transform 0.2s ease;
        }

        .play-btn:hover, .play-btn.hovered {
          transform: translate(-50%, -50%) scale(1.1);
          background: rgba(255, 255, 255, 0.25);
        }

        .play-btn.clicked {
          transform: translate(-50%, -50%) scale(0.95) !important;
        }

        .play-btn::after {
          content: '';
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 12px 0 12px 20px;
          border-color: transparent transparent transparent #ffffff;
          margin-left: 5px;
        }

        .play-btn.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .simulated-cursor {
          position: fixed;
          top: 0;
          left: 0;
          width: 48px;
          height: 48px;
          z-index: 9999;
          pointer-events: none;
          transition: opacity 0.4s ease;
          transform: translate(-100px, -100px);
        }

        .simulated-cursor svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.7));
        }

        .simulated-cursor.hidden {
          opacity: 0;
        }

        .action-buttons {
          display: flex;
          gap: 16px;
          margin-top: -30px;
          font-family: 'Inter', sans-serif;
          z-index: 5;
        }

        .action-buttons .btn {
          padding: 12px 24px;
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .action-buttons .btn-primary {
          background-color: #2B7FFF;
          color: #ffffff;
          border: 1px solid #2B7FFF;
          box-shadow: 0 4px 14px rgba(43, 127, 255, 0.3);
        }

        .action-buttons .btn-primary:hover {
          background-color: #1E6DEB;
          border-color: #1E6DEB;
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 8px 24px rgba(43, 127, 255, 0.5);
        }

        .action-buttons .btn-secondary {
          background-color: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
        }

        .action-buttons .btn-secondary:hover {
          background-color: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.3);
          color: #ffffff;
          transform: translateY(-3px) scale(1.03);
        }

        .action-buttons.visible .btn {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .action-buttons.visible .btn:nth-child(1) { transition-delay: 0.1s; }
        .action-buttons.visible .btn:nth-child(2) { transition-delay: 0.25s; }
        .action-buttons.visible .btn:nth-child(3) { transition-delay: 0.4s; }

        @media (max-width: 768px) {
          .bg-preview {
            font-size: 2rem;
            left: 5%;
            top: 20%;
          }
          .action-buttons {
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 8px;
            gap: 12px;
          }
        }
      `}</style>

      {/* Floating navigation controls to return to the application */}
      <div className="fixed top-6 left-6 z-50 pointer-events-auto">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs font-medium text-neutral-300 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
          style={{ fontFamily: "'Inter', sans-serif" }}
          data-testid="button-back-to-home"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>AJ—INDUSTRY</span>
        </Link>
      </div>

      {/* Left-Side Watermark Preview (Higher Position) */}
      <div
        ref={bgPreviewRef}
        id="bgPreview"
        className={`bg-preview ${isPreviewVisible ? 'visible' : ''}`}
        aria-hidden="true"
      >
        {previewText}
      </div>

      {/* Simulated Cursor (48px) */}
      <div ref={cursorRef} id="cursor" className="simulated-cursor">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5.5 3.5L18.5 12L12 13.5L8.5 19.5L5.5 3.5Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="wrapper">
        <div
          ref={playBtnRef}
          id="playBtn"
          className="play-btn"
          onClick={runAnimationSequence}
          role="button"
          aria-label="Play sequence"
          tabIndex={0}
        />
        <canvas ref={canvasRef} id="canvas" className="dev-canvas" />

        <div ref={actionButtonsRef} id="actionButtons" className="action-buttons">
          <a
            href="https://wa.me/963953316416"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            data-preview="+963 953316416"
            onMouseEnter={() => handleMouseEnter('+963 953316416')}
            onMouseLeave={handleMouseLeave}
            data-testid="btn-dev-whatsapp"
          >
            <span>WhatsApp</span>
          </a>
          <a
            href="mailto:amj.tech.work@gmail.com"
            className="btn btn-secondary"
            data-preview="amj.tech.work@gmail.com"
            onMouseEnter={() => handleMouseEnter('amj.tech.work@gmail.com')}
            onMouseLeave={handleMouseLeave}
            data-testid="btn-dev-email"
          >
            <span>Email</span>
          </a>
          <a
            href="https://amj.ahmed-aljassem.free.nt"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            data-preview="amj.ahmed-aljassem.free.nt"
            onMouseEnter={() => handleMouseEnter('amj.ahmed-aljassem.free.nt')}
            onMouseLeave={handleMouseLeave}
            data-testid="btn-dev-portfolio"
          >
            <span>Dev Portfolio &rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default DeveloperPage;

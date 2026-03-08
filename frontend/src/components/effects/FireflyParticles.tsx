import { useEffect, useRef } from 'react';
import type { EffectIntensity } from '../../context/PreferencesContext';

interface Firefly {
    x: number;
    y: number;
    radius: number;
    speedX: number;
    speedY: number;
    alpha: number;
    fading: boolean;
    color: string;
}

interface FireflyParticlesProps {
    intensity?: EffectIntensity;
}

export function FireflyParticles({ intensity = 'full' }: FireflyParticlesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let fireflies: Firefly[] = [];

        // Intensity multipliers
        const countMultiplier = intensity === 'subtle' ? 0.3 : 1;
        const speedMultiplier = intensity === 'subtle' ? 0.5 : 1;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initFireflies();
        };

        const initFireflies = () => {
            const count = Math.floor((window.innerWidth / 15) * countMultiplier);
            fireflies = [];
            for (let i = 0; i < count; i++) {
                createFirefly();
            }
        };

        const createFirefly = () => {
            fireflies.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1,
                speedX: (Math.random() * 1 - 0.5) * speedMultiplier,
                speedY: (Math.random() * 1 - 0.5) * speedMultiplier,
                alpha: Math.random(),
                fading: Math.random() > 0.5,
                color: `rgba(255, 215, 0,`, // Gold/Yellow base
            });
        };

        const updateFireflies = () => {
            fireflies.forEach(img => {
                // Movement
                img.x += img.speedX;
                img.y += img.speedY;

                // Bounce off edges
                if (img.x < 0 || img.x > canvas.width) img.speedX *= -1;
                if (img.y < 0 || img.y > canvas.height) img.speedY *= -1;

                // Fading effect
                const fadeSpeed = intensity === 'subtle' ? 0.005 : 0.01;
                if (img.fading) {
                    img.alpha -= fadeSpeed;
                    if (img.alpha <= 0) {
                        img.alpha = 0;
                        img.fading = false;
                        if (Math.random() < 0.1) {
                            img.x = Math.random() * canvas.width;
                            img.y = Math.random() * canvas.height;
                        }
                    }
                } else {
                    img.alpha += fadeSpeed;
                    if (img.alpha >= 1) {
                        img.alpha = 1;
                        img.fading = true;
                    }
                }

                // Mouse interaction (Attraction)
                if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
                    const dx = mouseRef.current.x - img.x;
                    const dy = mouseRef.current.y - img.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const attractionRange = 200;

                    if (dist < attractionRange) {
                        img.x += (dx / dist) * 2;
                        img.y += (dy / dist) * 2;
                        img.alpha = Math.min(1, img.alpha + 0.05);
                    }
                }
            });
        };

        const drawFireflies = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'lighter';

            fireflies.forEach(f => {
                const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 4);
                gradient.addColorStop(0, `${f.color} ${f.alpha})`);
                gradient.addColorStop(1, `${f.color} 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.radius * 4, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
        };

        const animate = () => {
            updateFireflies();
            drawFireflies();
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: null, y: null };
        }

        const handleClick = (e: MouseEvent) => {
            for (let i = 0; i < 5; i++) {
                fireflies.push({
                    x: e.clientX,
                    y: e.clientY,
                    radius: Math.random() * 3 + 1,
                    speedX: (Math.random() * 4 - 2) * speedMultiplier,
                    speedY: (Math.random() * 4 - 2) * speedMultiplier,
                    alpha: 1,
                    fading: true,
                    color: `rgba(255, 100, 0,` // More orange/intense
                })
            }
        }

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleClick);
        window.addEventListener('mouseleave', handleMouseLeave);

        resizeCanvas();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleClick);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [intensity]);

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-[0] opacity-80" />;
}

import { useEffect, useRef } from 'react';

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

export function FireflyParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let fireflies: Firefly[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initFireflies();
        };

        const initFireflies = () => {
            const count = Math.floor(window.innerWidth / 15);
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
                speedX: Math.random() * 1 - 0.5,
                speedY: Math.random() * 1 - 0.5,
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
                if (img.fading) {
                    img.alpha -= 0.01;
                    if (img.alpha <= 0) {
                        img.alpha = 0;
                        img.fading = false;
                        // Reposition occasionally when fully faded
                        if (Math.random() < 0.1) {
                            img.x = Math.random() * canvas.width;
                            img.y = Math.random() * canvas.height;
                        }
                    }
                } else {
                    img.alpha += 0.01;
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
                        // Glow brighter near mouse
                        img.alpha = Math.min(1, img.alpha + 0.05);
                    }
                }
            });
        };

        const drawFireflies = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Global composite operation for glowing effect
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

        // Handling click for "explosion" or disperse effect is nice, 
        // but user asked for "glow like firefly in screen if user click on it".
        // Let's make them converge or pulse on click.
        const handleClick = (e: MouseEvent) => {
            // Creating a temporary burst of new fireflies at click
            for (let i = 0; i < 5; i++) {
                fireflies.push({
                    x: e.clientX,
                    y: e.clientY,
                    radius: Math.random() * 3 + 1,
                    speedX: Math.random() * 4 - 2,
                    speedY: Math.random() * 4 - 2,
                    alpha: 1,
                    fading: true,
                    color: `rgba(255, 100, 0,` // More orange/intense
                })
            }
        }

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleClick); // Use mousedown for instant reaction
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
    }, []);

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-[0] opacity-80" />;
    // z-index 0 to be behind heavy generic content but careful not to block clicks if pointer-events is auto. 
    // pointer-events-none ensures clicks pass through to UI, but we listen on window for interaction.
}

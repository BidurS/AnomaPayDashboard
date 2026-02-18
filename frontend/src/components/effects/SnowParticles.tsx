import { useEffect, useRef } from 'react';

interface SnowParticle {
    x: number;
    y: number;
    radius: number;
    speed: number;
    wind: number;
}

export function SnowParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: SnowParticle[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            const particleCount = Math.floor(window.innerWidth / 10); // Responsive count
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 2 + 1,
                    speed: Math.random() * 1 + 0.5,
                    wind: Math.random() * 0.5 - 0.25,
                });
            }
        };

        const updateParticles = () => {
            particles.forEach(p => {
                p.y += p.speed;
                p.x += p.wind;

                if (p.y > canvas.height) {
                    p.y = -p.radius;
                    p.x = Math.random() * canvas.width;
                }
                if (p.x > canvas.width) p.x = 0;
                if (p.x < 0) p.x = canvas.width;
            });
        };

        const drawParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.beginPath();
            particles.forEach(p => {
                ctx.moveTo(p.x, p.y);
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            });
            ctx.fill();
        };

        const animate = () => {
            updateParticles();
            drawParticles();
            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1]" />;
}

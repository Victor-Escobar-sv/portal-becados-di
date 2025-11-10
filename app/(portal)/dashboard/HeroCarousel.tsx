'use client';

import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function HeroCarousel() {
  const autoplayPlugin = Autoplay({
    delay: 7000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
  });

  const images = [
    '/primera.jpg',
    '/segunda.jpg',
    '/tercera.jpg',
    '/cuarta.jpg',
    '/quinta.jpg',
    '/sexta.jpg',
  ];

  return (
    <div className="relative w-full">
      <Carousel
        plugins={[autoplayPlugin]}
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {images.map((src, index) => (
            <CarouselItem key={index}>
              <div className="relative h-[400px] w-full overflow-hidden rounded-lg md:h-[500px]">
                <Image
                  src={src}
                  alt={`Slide ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                {/* Overlay oscuro para mejor contraste del texto */}
                <div className="absolute inset-0 z-0 bg-black/70" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}


import React, { useState } from 'react';
import { Play } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  video?: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, video }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: 'none' });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${images[activeIdx]})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '200%' // double zoom
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Viewport */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-luxury-gray border border-white/5 shadow-lg">
        {showVideo && video ? (
          <div className="w-full h-full relative">
            <iframe
              src={video}
              title="Apresentação do Produto"
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
            <button
              onClick={() => setShowVideo(false)}
              className="absolute bottom-4 right-4 bg-luxury-black/80 hover:bg-luxury-black text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg border border-white/10"
            >
              Ver Fotos
            </button>
          </div>
        ) : (
          <div
            className="w-full h-full relative overflow-hidden cursor-crosshair group"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Base Image */}
            <img
              src={images[activeIdx]}
              alt="Visualização do Produto"
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {/* Magnifier glass layer */}
            <div
              className="absolute inset-0 pointer-events-none border border-gold-500/10 rounded-2xl bg-no-repeat transition-opacity duration-150"
              style={zoomStyle}
            />

            {video && (
              <button
                onClick={() => setShowVideo(true)}
                className="absolute bottom-4 right-4 bg-luxury-black/80 hover:bg-gold-500 hover:text-luxury-black text-white p-2.5 rounded-full border border-white/10 transition-all shadow-lg flex items-center justify-center"
                title="Assista ao vídeo do produto"
              >
                <Play size={16} fill="currentColor" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {(images.length > 1 || video) && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveIdx(idx);
                setShowVideo(false);
              }}
              className={`w-16 h-16 rounded-lg overflow-hidden bg-luxury-gray border transition shrink-0 ${
                activeIdx === idx && !showVideo ? 'border-gold-500 shadow' : 'border-white/5 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          
          {video && (
            <button
              onClick={() => setShowVideo(true)}
              className={`w-16 h-16 rounded-lg bg-luxury-dark border flex flex-col items-center justify-center text-gray-400 hover:text-white transition shrink-0 ${
                showVideo ? 'border-gold-500' : 'border-white/5 opacity-60 hover:opacity-100'
              }`}
            >
              <Play size={16} />
              <span className="text-[8px] uppercase tracking-wider mt-1 font-bold">Vídeo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default ProductGallery;

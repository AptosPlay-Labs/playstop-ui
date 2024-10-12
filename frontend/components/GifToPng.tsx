import { useState, useEffect } from 'react';

//@ts-ignore
const GifToPng = ({ src, alt, className }) => {
  const [pngSrc, setPngSrc] = useState('');

  useEffect(() => {
    const convertGifToPng = async () => {
      // Crear un elemento de imagen
      const img = new Image();
      img.src = src;
      img.crossOrigin = "Anonymous";  // Necesario si la imagen es de otro dominio

      // Esperar a que la imagen se cargue
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Crear un canvas y dibujar la imagen en él
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      // Convertir el canvas a PNG
      const pngDataUrl = canvas.toDataURL('image/png');
      setPngSrc(pngDataUrl);
    };

    convertGifToPng();
  }, [src]);

  // Mostrar la imagen original mientras se convierte
  return <img src={pngSrc || src} alt={alt} className={className} />;
};

export default GifToPng;
import React, { useState, useEffect } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackType?: 'avatar' | 'logo';
    fallbackName?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({
    src,
    fallbackType = 'avatar',
    fallbackName = '',
    alt = '',
    className = '',
    ...props
}) => {
    const [errorCount, setErrorCount] = useState(0);
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

    useEffect(() => {
        setCurrentSrc(src);
        setErrorCount(0);
    }, [src]);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (errorCount >= 2) {
            // If even the fallbacks fail, stop trying
            e.currentTarget.style.display = 'none';
            return;
        }

        setErrorCount(prev => prev + 1);

        if (fallbackType === 'avatar') {
            setCurrentSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'User')}&background=f8fafc&color=475569`);
        } else {
            setCurrentSrc(`https://placehold.co/200x200?text=${encodeURIComponent(fallbackName || 'Logo')}`);
        }
    };

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            onError={handleError}
            {...props}
        />
    );
};

export default SafeImage;

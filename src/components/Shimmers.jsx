import React from 'react';

const ShimmerBlock = ({ style, className }) => (
    <div
        className={className}
        style={{
            background: '#f0f0f0',
            backgroundImage: 'linear-gradient(90deg, #f0f0f0 0px, #f8f8f8 40px, #f0f0f0 80px)',
            backgroundSize: '300px 100%',
            animation: 'shimmer 1.5s infinite linear forwards',
            borderRadius: 10,
            ...style
        }}
    >
        <style>{`
            @keyframes shimmer {
                0% { background-position: -300px 0; }
                100% { background-position: 300px 0; }
            }
        `}</style>
    </div>
);

export const MenuSkeleton = () => {
    return (
        <div style={{ padding: '0 16px', paddingTop: 20 }}>
            {/* Header / Divider Skeleton */}
            <ShimmerBlock style={{ height: 64, width: '100%', marginBottom: 32, borderRadius: 12 }} />

            {/* Category Pills Skeleton */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflow: 'hidden' }}>
                {[1, 2, 3, 4].map(i => (
                    <ShimmerBlock key={i} style={{ height: 36, width: 90, borderRadius: 20, flexShrink: 0 }} />
                ))}
            </div>

            {/* Grid Skeleton */}
            <div style={{ marginBottom: 24 }}>
                {/* Section Title */}
                <ShimmerBlock style={{ height: 24, width: 120, marginBottom: 16 }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i}>
                            {/* Photo Box */}
                            <ShimmerBlock style={{ width: '100%', aspectRatio: '1', marginBottom: 8, borderRadius: 10 }} />
                            {/* Text Lines */}
                            <ShimmerBlock style={{ height: 12, width: '80%', marginBottom: 4 }} />
                            <ShimmerBlock style={{ height: 10, width: '40%' }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const HeaderSkeleton = () => (
    <div style={{ padding: 24, paddingBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <ShimmerBlock style={{ height: 40, width: 40, borderRadius: '50%' }} />
            <ShimmerBlock style={{ height: 40, width: 40, borderRadius: '50%' }} />
        </div>
    </div>
);
